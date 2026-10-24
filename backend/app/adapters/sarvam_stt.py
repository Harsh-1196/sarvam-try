from pydantic import BaseModel
from app.config import settings
from app.errors import AppError
from app.adapters.base import request_with_retry
from app.pipeline.languages import normalize_lang_code


class Transcript(BaseModel):
    transcript: str
    language_code: str | None = None


class SarvamSTT:
    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or settings.SARVAM_API_KEY
        self.base_url = (base_url or settings.SARVAM_BASE_URL).rstrip("/")
        self.model = settings.STT_MODEL

    async def transcribe(
        self,
        audio_bytes: bytes,
        content_type: str = "audio/webm",
        language_hint: str | None = None,
        mode: str = "codemix",
    ) -> Transcript:
        """
        Transcribes audio bytes to text using Sarvam Saaras.
        Natively accepts webm, mp4, opus, wav, etc.
        """
        if not audio_bytes or len(audio_bytes) < 100:
            raise AppError("STT_FAILED", "Audio data is empty or too short", status_code=400, retryable=True)

        url = f"{self.base_url}/speech-to-text"
        headers = {
            "api-subscription-key": self.api_key,
        }

        # Clean and normalize MIME type and file extension for Sarvam STT
        # Sarvam strictly rejects parameters like ';codecs=opus'
        clean_mime = "audio/webm"
        ext = "webm"
        low = content_type.lower()
        if "wav" in low:
            clean_mime = "audio/wav"
            ext = "wav"
        elif "mp4" in low or "m4a" in low:
            clean_mime = "audio/mp4"
            ext = "mp4"
        elif "webm" in low:
            clean_mime = "audio/webm"
            ext = "webm"
        elif "ogg" in low or "opus" in low:
            clean_mime = "audio/ogg"
            ext = "ogg"
        elif "mp3" in low or "mpeg" in low:
            clean_mime = "audio/mpeg"
            ext = "mp3"

        files = {
            "file": (f"audio.{ext}", audio_bytes, clean_mime),
        }

        data: dict[str, str] = {
            "model": self.model,
            "mode": mode,
        }
        if language_hint and language_hint != "auto" and language_hint != "unknown":
            data["language_code"] = normalize_lang_code(language_hint)
        else:
            data["language_code"] = "unknown"

        res = await request_with_retry(
            method="POST",
            url=url,
            headers=headers,
            files=files,
            data=data,
            error_code="STT_FAILED",
            timeout=30.0,
        )

        resp_json = res.json()
        transcript = resp_json.get("transcript", "").strip()
        lang_detected = resp_json.get("language_code")

        return Transcript(transcript=transcript, language_code=lang_detected)
