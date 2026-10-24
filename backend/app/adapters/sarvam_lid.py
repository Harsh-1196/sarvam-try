from app.config import settings
from app.errors import AppError
from app.adapters.base import request_with_retry


class SarvamLID:
    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or settings.SARVAM_API_KEY
        self.base_url = (base_url or settings.SARVAM_BASE_URL).rstrip("/")

    async def identify(self, text: str) -> str:
        """
        Identifies the language code of the input text snippet (up to 1000 chars).
        Returns BCP-47 tag (e.g., 'hi-IN', 'en-IN').
        """
        if not text or len(text.strip()) == 0:
            return "hi-IN"

        cleaned = text.strip()[:1000]
        url = f"{self.base_url}/text-lid"
        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json",
        }
        payload = {"input": cleaned}

        res = await request_with_retry(
            method="POST",
            url=url,
            headers=headers,
            json=payload,
            error_code="LID_FAILED",
            timeout=15.0,
        )

        data = res.json()
        lang_code = data.get("language_code")
        if not lang_code:
            return "hi-IN"
        return lang_code
