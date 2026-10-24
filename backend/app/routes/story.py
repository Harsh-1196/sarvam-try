import asyncio
from fastapi import APIRouter, BackgroundTasks
from app.session_store import session_store
from app.errors import AppError
from app.models import (
    StoryCreateRequest,
    StoryStatusResponse,
    ArticleDetailRequest,
    ArticleDetailResponse,
)
from app.adapters.sarvam_translate import SarvamTranslate
from app.adapters.sarvam_tts import SarvamTTS
from app.pipeline.languages import normalize_lang_code, is_tts_supported
from app.pipeline.search import SearchPipeline
from app.pipeline.registry import build_source_registry
from app.pipeline.pivot import apply_pivot_translation
from app.pipeline.story import StoryPipeline

router = APIRouter(prefix="/api/story", tags=["story"])


async def run_story_generation_job(
    session_id: str,
    headline: str,
    newspaper_date: str | None,
    display_language: str,
    newspaper_only: bool,
):
    lock = session_store.get_lock(session_id)
    async with lock:
        session = session_store.get_session(session_id)
        try:
            session.status = "processing"
            session.selected_headline = headline
            session.display_language = display_language
            notices: list[str] = []

            # 1. Search (unless newspaper_only is requested)
            search_results = []
            url_to_cluster = {}
            if not newspaper_only:
                session.stage = "search"
                search_pipe = SearchPipeline()
                from datetime import datetime
                parsed_date = datetime.strptime(newspaper_date, "%Y-%m-%d").date() if newspaper_date else None
                search_results, search_notices, url_to_cluster = await search_pipe.search_and_rank(
                    headline=headline,
                    newspaper_date=parsed_date,
                    detected_language=session.detected_language,
                )
                notices.extend(search_notices)

                if not search_results:
                    session.status = "failed"
                    session.error = {
                        "code": "NO_SOURCES",
                        "message": "No related web articles found for this headline within the time window. You can build the story using the newspaper clipping only.",
                        "retryable": False,
                    }
                    return
            else:
                notices.append("Story generated using the newspaper article alone (no external web sources).")

            # 2. Extract & Build Registry S0..S5
            session.stage = "extract"
            sources, reg_notices = await build_source_registry(
                selected_headline=headline,
                ocr_blocks=session.ocr_blocks,
                detected_language=session.detected_language or "hi-IN",
                newspaper_date=newspaper_date,
                search_results=search_results,
                url_to_cluster=url_to_cluster,
            )
            notices.extend(reg_notices)

            # 3. Pivot Translation
            session.stage = "pivot"
            pivoted_sources, pivot_notices = await apply_pivot_translation(sources)
            notices.extend(pivot_notices)
            session.sources = pivoted_sources

            # 4. Generate Story & Validate
            session.stage = "generate"
            story_pipe = StoryPipeline()
            story = await story_pipe.generate_and_validate(
                headline=headline,
                newspaper_date=newspaper_date,
                display_language=display_language,
                sources=pivoted_sources,
                initial_notices=notices,
            )

            session.story = story
            session.status = "ready"
            session.stage = "ready"

        except AppError as e:
            session.status = "failed"
            session.error = e.to_dict()["error"]
        except Exception as e:
            session.status = "failed"
            session.error = {
                "code": "LLM_FAILED",
                "message": f"Story generation error: {str(e)}",
                "retryable": True,
            }


@router.post("", status_code=202)
async def create_story(
    req: StoryCreateRequest,
    background_tasks: BackgroundTasks,
):
    session = session_store.get_session(req.session_id)
    if not session.ocr_blocks:
        raise AppError("STAGE_NOT_READY", "OCR text has not been extracted yet.", status_code=400)

    session.stage = "search"
    session.status = "processing"
    session.error = None

    date_str = req.newspaper_date.isoformat() if req.newspaper_date else session.newspaper_date

    background_tasks.add_task(
        run_story_generation_job,
        session.id,
        req.headline,
        date_str,
        req.display_language,
        req.newspaper_only,
    )

    return {"status": "processing", "stage": "search"}


@router.get("/{sid}", response_model=StoryStatusResponse)
async def get_story_status(sid: str):
    session = session_store.get_session(sid)
    return StoryStatusResponse(
        status=session.status,
        stage=session.stage,
        story=session.story,
        error=session.error,
    )


@router.post("/article-detail", response_model=ArticleDetailResponse)
async def get_article_detail(req: ArticleDetailRequest):
    session = session_store.get_session(req.session_id)
    if not session.sources:
        raise AppError("STAGE_NOT_READY", "No sources found for this session.", status_code=400)

    source = next((s for s in session.sources if s.id == req.source_id), None)
    if not source:
        raise AppError("SOURCE_NOT_FOUND", f"Source {req.source_id} not found", status_code=404)

    target_lang = normalize_lang_code(req.target_language)
    source_lang = normalize_lang_code(source.language)

    translated_title = source.title
    # Clean and slice original text for reader
    original_body = source.original_text.strip()
    reader_body = original_body[:2500] if len(original_body) > 2500 else original_body
    translated_body = reader_body

    # Translate if target language differs
    if target_lang != source_lang:
        try:
            translator = SarvamTranslate()
            translated_title = await translator.translate(
                source.title,
                source=source_lang,
                target=target_lang,
            )
            translated_body = await translator.translate(
                reader_body,
                source=source_lang,
                target=target_lang,
            )
        except Exception:
            # Fallback to model_text or original_text if translation fails
            translated_title = source.title
            translated_body = reader_body

    # Build concise 2-sentence summary for audio readout
    sentences = [s.strip() for s in translated_body.split(".") if s.strip()]
    summary_text = ". ".join(sentences[:2]) + "." if sentences else translated_body[:180]

    # Synthesize audio summary if TTS supported
    audio_base64 = None
    audio_mime = None
    if is_tts_supported(target_lang):
        try:
            tts = SarvamTTS()
            clip = await tts.speak(summary_text, language=target_lang)
            audio_base64 = clip.base64
            audio_mime = clip.mime
        except Exception:
            pass

    pub_date_str = source.published_at.isoformat() if source.published_at else None

    return ArticleDetailResponse(
        source_id=source.id,
        title=source.title,
        translated_title=translated_title,
        publisher=source.publisher,
        url=source.url,
        published_date=pub_date_str,
        image_url=source.image_url,
        original_text=original_body,
        translated_text=translated_body,
        target_language=target_lang,
        summary=summary_text,
        audio_base64=audio_base64,
        audio_mime=audio_mime,
    )
