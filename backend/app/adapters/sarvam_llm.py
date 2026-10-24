import json
import re
from typing import Any
from app.config import settings
from app.errors import AppError
from app.adapters.base import request_with_retry


def extract_json_from_response(raw_text: str) -> dict[str, Any]:
    """Extracts and parses JSON from model response text, stripping markdown code fences."""
    cleaned = raw_text.strip()
    # Match ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
    if match:
        cleaned = match.group(1).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        # Try finding the first '{' and last '}'
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                pass
        raise AppError(
            "LLM_INVALID_JSON",
            f"Model did not return valid JSON: {str(e)}",
            status_code=502,
            retryable=True,
        )


class SarvamLLM:
    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or settings.SARVAM_API_KEY
        self.base_url = (base_url or settings.SARVAM_BASE_URL).rstrip("/")
        self.model = settings.LLM_MODEL

    async def chat_text(
        self,
        system: str,
        user: str,
        max_tokens: int = 2048,
        temperature: float = 0.1,
    ) -> str:
        """Sends chat completion request and returns text output."""
        url = f"{self.base_url}/v1/chat/completions"
        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        res = await request_with_retry(
            method="POST",
            url=url,
            headers=headers,
            json=payload,
            error_code="LLM_FAILED",
            timeout=60.0,
        )

        data = res.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise AppError("LLM_FAILED", f"Unexpected LLM response structure: {str(e)}", status_code=502)

    async def chat_json(
        self,
        system: str,
        user: str,
        schema_hint: dict | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        """Sends chat completion request with JSON format and returns parsed dictionary."""
        url = f"{self.base_url}/v1/chat/completions"
        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }

        res = await request_with_retry(
            method="POST",
            url=url,
            headers=headers,
            json=payload,
            error_code="LLM_FAILED",
            timeout=60.0,
        )

        data = res.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise AppError("LLM_FAILED", f"Unexpected LLM response structure: {str(e)}", status_code=502)

        return extract_json_from_response(content)
