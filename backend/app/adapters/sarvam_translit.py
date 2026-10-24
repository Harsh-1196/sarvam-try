from app.config import settings
from app.adapters.base import request_with_retry
from app.pipeline.languages import normalize_lang_code


class SarvamTranslit:
    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or settings.SARVAM_API_KEY
        self.base_url = (base_url or settings.SARVAM_BASE_URL).rstrip("/")

    async def transliterate(self, text: str, source: str = "hi-IN", target: str = "en-IN") -> str:
        """Transliterates text between Indic and Latin scripts."""
        if not text or not text.strip():
            return ""

        norm_source = normalize_lang_code(source)
        norm_target = normalize_lang_code(target)

        url = f"{self.base_url}/transliterate"
        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "input": text.strip()[:1000],
            "source_language_code": norm_source,
            "target_language_code": norm_target,
        }

        res = await request_with_retry(
            method="POST",
            url=url,
            headers=headers,
            json=payload,
            error_code="TRANSLIT_FAILED",
            timeout=15.0,
        )

        data = res.json()
        return data.get("transliterated_text", text)
