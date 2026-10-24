import re
from app.config import settings
from app.adapters.base import request_with_retry
from app.pipeline.languages import normalize_lang_code


def split_into_sentence_chunks(text: str, max_chunk_len: int = 1800) -> list[str]:
    """Splits text into chunks of at most max_chunk_len at sentence or newline boundaries."""
    if len(text) <= max_chunk_len:
        return [text]

    # Split on sentence endings or paragraph boundaries
    sentences = re.split(r'(?<=[।\.\?\!\n])\s+', text)
    chunks = []
    current_chunk = []
    current_len = 0

    for s in sentences:
        s_len = len(s)
        if current_len + s_len + 1 > max_chunk_len:
            if current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = [s]
                current_len = s_len
            else:
                # A single sentence longer than max_chunk_len: split by words
                words = s.split()
                sub_chunk = []
                sub_len = 0
                for w in words:
                    if sub_len + len(w) + 1 > max_chunk_len:
                        if sub_chunk:
                            chunks.append(" ".join(sub_chunk))
                        sub_chunk = [w]
                        sub_len = len(w)
                    else:
                        sub_chunk.append(w)
                        sub_len += len(w) + 1
                if sub_chunk:
                    current_chunk = sub_chunk
                    current_len = sub_len
        else:
            current_chunk.append(s)
            current_len += s_len + 1

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks


class SarvamTranslate:
    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or settings.SARVAM_API_KEY
        self.base_url = (base_url or settings.SARVAM_BASE_URL).rstrip("/")
        self.model = settings.TRANSLATE_MODEL

    async def translate(self, text: str, source: str = "auto", target: str = "en-IN") -> str:
        """
        Translates text from source language to target language.
        Respects max input length by chunking at sentence boundaries.
        """
        if not text or not text.strip():
            return ""

        norm_source = normalize_lang_code(source) if source != "auto" else "auto"
        norm_target = normalize_lang_code(target)

        if norm_source == norm_target and norm_source != "auto":
            return text

        chunks = split_into_sentence_chunks(text, max_chunk_len=1800)
        translated_parts = []

        url = f"{self.base_url}/translate"
        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json",
        }

        for chunk in chunks:
            if not chunk.strip():
                continue
            payload = {
                "input": chunk,
                "source_language_code": norm_source,
                "target_language_code": norm_target,
                "model": self.model,
                "mode": "formal",
            }
            res = await request_with_retry(
                method="POST",
                url=url,
                headers=headers,
                json=payload,
                error_code="TRANSLATE_FAILED",
                timeout=30.0,
            )
            data = res.json()
            translated_parts.append(data.get("translated_text", chunk))

        return "\n".join(translated_parts)
