from fastapi import APIRouter, UploadFile, File, Form
from app.session_store import session_store
from app.errors import AppError
from app.models import AskResponse, TtsRequest, TtsResponse
from app.pipeline.qa import QaPipeline
from app.adapters.sarvam_tts import SarvamTTS

router = APIRouter(prefix="/api", tags=["qa"])


@router.post("/ask", response_model=AskResponse)
async def ask_question(
    session_id: str = Form(...),
    display_language: str = Form("hi-IN"),
    want_audio: bool = Form(True),
    text: str | None = Form(None),
    audio: UploadFile | None = File(None),
):
    session = session_store.get_session(session_id)
    if not session.story or not session.sources:
        raise AppError("STAGE_NOT_READY", "Story has not been generated yet for this session.", status_code=400)

    audio_bytes = None
    content_type = "audio/webm"
    if audio:
        audio_bytes = await audio.read()
        content_type = audio.content_type or "audio/webm"
        if len(audio_bytes) > 10 * 1024 * 1024:
            raise AppError("AUDIO_TOO_LARGE", "Audio recording exceeds 10 MB limit.", status_code=400)

    if not audio_bytes and not text:
        raise AppError("INVALID_REQUEST", "Please supply either voice audio or a question text.", status_code=400)

    qa_pipe = QaPipeline()
    response = await qa_pipe.answer_question(
        story=session.story,
        sources=session.sources,
        question_text=text,
        audio_bytes=audio_bytes,
        audio_content_type=content_type,
        display_language=display_language,
        want_audio=want_audio,
    )
    return response


@router.post("/tts", response_model=TtsResponse)
async def synthesize_speech(req: TtsRequest):
    tts = SarvamTTS()
    clip = await tts.speak(text=req.text, language=req.language)
    return TtsResponse(mime=clip.mime, base64=clip.base64)
