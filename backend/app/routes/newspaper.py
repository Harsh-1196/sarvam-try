import asyncio
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks
from app.session_store import session_store
from app.errors import AppError
from app.models import (
    NewspaperUploadResponse,
    NewspaperStatusResponse,
)
from app.pipeline.ocr import run_ocr_pipeline
from app.pipeline.newspaper_date import detect_newspaper_date
from app.pipeline.headlines import extract_headline_candidates
from app.config import settings

router = APIRouter(prefix="/api/newspaper", tags=["newspaper"])


async def process_newspaper_job(session_id: str, image_bytes: bytes, language_hint: str | None):
    lock = session_store.get_lock(session_id)
    async with lock:
        session = session_store.get_session(session_id)
        try:
            session.stage = "ocr"
            session.status = "processing"

            # 1. OCR + LID
            blocks, full_text, detected_lang, meta = await run_ocr_pipeline(
                image_bytes, language_hint=language_hint
            )
            session.ocr_blocks = blocks
            session.ocr_text = full_text
            session.detected_language = detected_lang
            session.image_meta = meta

            # Delete image_bytes right after OCR completes (Section 7)
            del image_bytes

            # 2. Newspaper Date detection
            n_date = detect_newspaper_date(full_text)
            session.newspaper_date = n_date.isoformat() if n_date else None

            # 3. Headline candidates
            session.stage = "headlines"
            candidates = await extract_headline_candidates(blocks)
            session.candidates = candidates

            session.status = "ready"
            session.stage = "pick_headline"

        except AppError as e:
            session.status = "failed"
            session.error = e.to_dict()["error"]
        except Exception:
            session.status = "failed"
            session.error = {
                "code": "OCR_FAILED",
                "message": "Newspaper processing failed unexpectedly. Please retry the scan.",
                "retryable": True,
            }


@router.post("", response_model=NewspaperUploadResponse, status_code=202)
async def upload_newspaper(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    language_hint: str | None = Form(None),
):
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    chunks: list[bytes] = []
    total_bytes = 0
    while chunk := await image.read(1024 * 1024):
        total_bytes += len(chunk)
        if total_bytes > max_bytes:
            raise AppError(
                "IMAGE_TOO_LARGE",
                f"Image exceeds maximum size of {settings.MAX_UPLOAD_MB} MB",
                status_code=400,
            )
        chunks.append(chunk)
    image_bytes = b"".join(chunks)
    if not image_bytes:
        raise AppError("IMAGE_INVALID", "Uploaded file is empty", status_code=400)

    session = session_store.create_session()
    session.stage = "ocr"
    session.status = "processing"

    background_tasks.add_task(
        process_newspaper_job,
        session.id,
        image_bytes,
        language_hint,
    )

    return NewspaperUploadResponse(
        session_id=session.id,
        stage="ocr",
        status="processing",
    )


@router.get("/{sid}", response_model=NewspaperStatusResponse)
async def get_newspaper_status(sid: str):
    session = session_store.get_session(sid)
    excerpt = session.ocr_text[:300] + ("..." if len(session.ocr_text) > 300 else "") if session.ocr_text else None

    return NewspaperStatusResponse(
        status=session.status,
        stage=session.stage,
        ocr_text_excerpt=excerpt,
        detected_language=session.detected_language,
        candidates=session.candidates,
        newspaper_date=session.newspaper_date,
        error=session.error,
    )
