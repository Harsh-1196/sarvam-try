import base64
import re
from pydantic import BaseModel, Field
from app.config import settings
from app.errors import AppError
from app.adapters.base import request_with_retry
from app.pipeline.languages import (
    normalize_lang_code,
    is_tts_supported,
    get_tts_speaker,
)


class AudioClip(BaseModel):
    mime: str = "audio/wav"
    base64: str
    chunks: list[str] = Field(default_factory=list)


def clean_text_for_tts(text: str) -> str:
    """Strips markdown, URLs, citation tokens like [S1], and extra whitespace."""
    # Remove citations like [S0], [S1], etc.
    cleaned = re.sub(r"\[S\d+\]", "", text)
    # Remove URLs
    cleaned = re.sub(r"https?://\S+", "", cleaned)
    # Remove bold, italics, code markers
    cleaned = re.sub(r"[*_`#>]", "", cleaned)
    # Normalize whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


class SarvamTTS:
    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or settings.SARVAM_API_KEY
        self.base_url = (base_url or settings.SARVAM_BASE_URL).rstrip("/")
        self.model = settings.TTS_MODEL

    async def speak(
        self,
        text: str,
        language: str = "hi-IN",
        speaker: str | None = None,
    ) -> AudioClip:
        """
        Synthesizes text into spoken WAV audio using Sarvam Bulbul.
        Returns base64 audio payload and MIME type.
        """
        cleaned = clean_text_for_tts(text)
        if not cleaned:
            raise AppError("TTS_FAILED", "Text to synthesize is empty", status_code=400, retryable=False)

        norm_lang = normalize_lang_code(language)
        if not is_tts_supported(norm_lang):
            raise AppError(
                "UNSUPPORTED_LANGUAGE",
                f"TTS is not supported for language '{norm_lang}'. Bulbul supports 11 primary Indian languages.",
                status_code=400,
                retryable=False,
            )

        is_v4 = "v4" in self.model.lower()
        active_speaker = speaker or get_tts_speaker(norm_lang, is_v4=is_v4)

        url = f"{self.base_url}/text-to-speech"
        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json",
        }

        # Max limit is 2500 chars. If text is longer, take first 2400 chars.
        text_to_send = cleaned[:2400]

        payload = {
            "text": text_to_send,
            "language_code": norm_lang,
            "speaker": active_speaker,
            "model": self.model,
            "speech_sample_rate": 22050,
            "output_audio_codec": "wav",
        }

        res = await request_with_retry(
            method="POST",
            url=url,
            headers=headers,
            json=payload,
            error_code="TTS_FAILED",
            timeout=30.0,
        )

        resp_json = res.json()
        audios = resp_json.get("audios", [])
        if not audios:
            raise AppError("TTS_FAILED", "No audio returned from TTS service", status_code=502, retryable=True)

        return AudioClip(
            mime="audio/wav",
            base64=audios[0],
            chunks=[audios[0]],
        )
