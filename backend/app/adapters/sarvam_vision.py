import asyncio
import io
import json
import re
import zipfile
from pydantic import BaseModel, Field
from app.config import settings
from app.errors import AppError
from app.models import Block
from app.adapters.base import request_with_retry
from app.pipeline.languages import normalize_lang_code


class OcrResult(BaseModel):
    blocks: list[Block] = Field(default_factory=list)
    full_text: str = ""
    detected_language: str | None = None


def parse_html_to_blocks(content: str) -> list[Block]:
    """
    Parses HTML content returned by Sarvam Vision into structured Blocks in reading order.
    Headings are marked as block_type='heading', paragraphs as 'paragraph'.
    """
    blocks: list[Block] = []
    order = 0

    # Match headings and paragraphs
    tag_pattern = re.compile(r"<(h[1-6]|p|li|blockquote)[^>]*>(.*?)</\1>", re.IGNORECASE | re.DOTALL)
    clean_tags = re.compile(r"<[^>]+>")

    for match in tag_pattern.finditer(content):
        tag_name = match.group(1).lower()
        inner_html = match.group(2)
        raw_text = clean_tags.sub(" ", inner_html)
        text = re.sub(r"\s+", " ", raw_text).strip()
        if not text:
            continue

        block_type = "heading" if tag_name.startswith("h") else "paragraph"
        blocks.append(
            Block(
                id=f"b{order + 1}",
                text=text,
                order=order,
                block_type=block_type,
            )
        )
        order += 1

    # Fallback if no matching HTML tags found: split by double newlines
    if not blocks:
        clean_text = clean_tags.sub(" ", content)
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", clean_text) if p.strip()]
        for idx, p in enumerate(paragraphs):
            blocks.append(
                Block(
                    id=f"b{idx + 1}",
                    text=p,
                    order=idx,
                    block_type="paragraph",
                )
            )

    return blocks


class SarvamVision:
    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or settings.SARVAM_API_KEY
        self.base_url = (base_url or settings.SARVAM_BASE_URL).rstrip("/")

    async def digitise(
        self,
        image_bytes: bytes,
        mime: str = "image/jpeg",
        language_hint: str | None = None,
    ) -> OcrResult:
        """
        Submits an image to Sarvam Vision Doc AI, polls status until completion,
        and parses result into structured Blocks.
        """
        if not image_bytes:
            raise AppError("IMAGE_INVALID", "Empty image payload", status_code=400)

        # 1. Submit digitise job
        url = f"{self.base_url}/doc-ai/v1/job/digitise"
        headers = {
            "api-subscription-key": self.api_key,
        }

        ext = "jpg" if "jpeg" in mime or "jpg" in mime else "png"
        files = {
            "file": (f"newspaper.{ext}", image_bytes, mime),
        }
        data: dict[str, str] = {
            "output_format": "html",
        }
        if language_hint and language_hint != "auto":
            data["language"] = normalize_lang_code(language_hint)

        res = await request_with_retry(
            method="POST",
            url=url,
            headers=headers,
            files=files,
            data=data,
            error_code="OCR_FAILED",
            timeout=30.0,
        )

        job_info = res.json()
        job_id = job_info.get("job_id")
        if not job_id:
            raise AppError("OCR_FAILED", "No job_id returned by Sarvam Vision", status_code=502)

        # 2. Poll job status until completed/failed (start at 2s, back off to 5s, max 120s)
        status_url = f"{self.base_url}/doc-ai/v1/job/{job_id}/status"
        poll_interval = 2.0
        elapsed = 0.0
        hard_limit = 120.0

        while elapsed < hard_limit:
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval
            if poll_interval < 5.0:
                poll_interval = min(5.0, poll_interval * 1.5)

            status_res = await request_with_retry(
                method="GET",
                url=status_url,
                headers=headers,
                error_code="OCR_FAILED",
                timeout=15.0,
            )
            st_data = status_res.json()
            st = st_data.get("status", "").lower()

            if st in ("completed", "partially_completed"):
                break
            elif st in ("failed", "rejected"):
                raise AppError("OCR_FAILED", f"Sarvam Vision job {job_id} {st}", status_code=502)

        if elapsed >= hard_limit:
            raise AppError("OCR_TIMEOUT", "OCR job timed out after 120 seconds", status_code=504, retryable=True)

        # 3. Retrieve results (default JSON returns structured blocks)
        results_url = f"{self.base_url}/doc-ai/v1/job/{job_id}/results"
        results_res = await request_with_retry(
            method="GET",
            url=results_url,
            headers=headers,
            error_code="OCR_FAILED",
            timeout=30.0,
        )

        blocks: list[Block] = []

        # Check if response is a zip file
        if results_res.content.startswith(b"PK"):
            combined_html = ""
            with zipfile.ZipFile(io.BytesIO(results_res.content)) as zf:
                for fname in zf.namelist():
                    if fname.endswith((".html", ".htm")):
                        combined_html += zf.read(fname).decode("utf-8", errors="replace") + "\n"
            blocks = parse_html_to_blocks(combined_html)
        else:
            try:
                results_data = results_res.json()
                documents = results_data.get("documents", [])
                order = 0
                for doc in documents:
                    for page in doc.get("pages", []):
                        raw_blocks = page.get("blocks", [])
                        if raw_blocks:
                            raw_blocks.sort(key=lambda b: b.get("reading_order", 0))
                            for rb in raw_blocks:
                                raw_t = rb.get("text", "")
                                clean_t = re.sub(r"<[^>]+>", " ", raw_t)
                                text = re.sub(r"\s+", " ", clean_t).strip()
                                if not text:
                                    continue
                                tag = rb.get("layout_tag", "").lower()
                                block_type = "heading" if tag in ("header", "title", "heading", "h1", "h2", "h3") else "paragraph"
                                blocks.append(
                                    Block(
                                        id=f"b{order + 1}",
                                        text=text,
                                        order=order,
                                        block_type=block_type,
                                    )
                                )
                                order += 1
                        elif page.get("content"):
                            blocks.extend(parse_html_to_blocks(page["content"]))
            except Exception:
                # Fallback to plain text
                blocks = parse_html_to_blocks(results_res.text)

        full_text = "\n\n".join(b.text for b in blocks)

        return OcrResult(
            blocks=blocks,
            full_text=full_text,
            detected_language=language_hint if language_hint != "auto" else None,
        )
