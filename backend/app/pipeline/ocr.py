import asyncio
import io
from PIL import Image, ImageOps
from app.config import settings
from app.errors import AppError
from app.models import Block
from app.adapters.sarvam_vision import SarvamVision
from app.adapters.sarvam_lid import SarvamLID


def validate_and_preprocess_image(image_bytes: bytes) -> tuple[bytes, str, dict]:
    """
    Validates magic bytes, checks max upload size, checks minimum dimensions (600px short side),
    downscales long edge to at most 3000px, strips EXIF, and returns (processed_bytes, mime, meta).
    """
    if len(image_bytes) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise AppError("IMAGE_TOO_LARGE", f"Image exceeds maximum size of {settings.MAX_UPLOAD_MB} MB", status_code=400)

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        # Re-open for operations
        img = Image.open(io.BytesIO(image_bytes))
    except Exception:
        raise AppError("IMAGE_INVALID", "Invalid or corrupted image format. Please upload JPEG or PNG.", status_code=400)

    orig_format = (img.format or "").upper()
    if orig_format not in ("JPEG", "JPG", "PNG", "WEBP"):
        raise AppError("IMAGE_INVALID", "Only JPEG, PNG, and WebP formats are accepted.", status_code=400)

    # Exif transpose & remove metadata
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    width, height = img.size
    short_edge = min(width, height)
    if short_edge < 600:
        raise AppError("IMAGE_TOO_SMALL", f"Image resolution too low ({width}x{height}). Short edge must be at least 600px.", status_code=400)

    # Downscale long edge to at most 3000px
    long_edge = max(width, height)
    if long_edge > 3000:
        ratio = 3000.0 / long_edge
        new_width = int(width * ratio)
        new_height = int(height * ratio)
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    out_io = io.BytesIO()
    if orig_format in ("JPEG", "JPG"):
        # Convert RGBA to RGB if needed
        if img.mode != "RGB":
            img = img.convert("RGB")
        img.save(out_io, format="JPEG", quality=90, optimize=True)
        mime = "image/jpeg"
    else:
        img.save(out_io, format="PNG", optimize=True)
        mime = "image/png"

    processed_bytes = out_io.getvalue()
    meta = {
        "original_width": width,
        "original_height": height,
        "processed_width": img.width,
        "processed_height": img.height,
        "mime": mime,
    }
    return processed_bytes, mime, meta


async def run_ocr_pipeline(
    image_bytes: bytes,
    language_hint: str | None = None,
    vision: SarvamVision | None = None,
    lid: SarvamLID | None = None,
) -> tuple[list[Block], str, str, dict]:
    """
    Executes full OCR pipeline:
    1. Preprocesses & validates image
    2. Calls Sarvam Vision digitisation
    3. Verifies minimum text content (at least 40 non-space characters)
    4. Detects the predominant language with one representative sample in auto mode
    """
    proc_bytes, mime, meta = validate_and_preprocess_image(image_bytes)

    if vision is None:
        vision = SarvamVision()
    if lid is None:
        lid = SarvamLID()

    ocr_result = await vision.digitise(proc_bytes, mime=mime, language_hint=language_hint)
    blocks = ocr_result.blocks

    # Validate non-space characters
    joined_text = "".join(b.text.replace(" ", "") for b in blocks)
    if len(joined_text) < 40:
        raise AppError("NO_TEXT_FOUND", "No readable text found on the uploaded newspaper image.", status_code=422)

    # A selected language is already known. In auto mode, one representative
    # sample is enough; calling the cloud LID endpoint once per OCR block added
    # serial network latency to every scan without improving the result reliably.
    if language_hint and language_hint != "auto":
        detected_lang = language_hint
    else:
        sample = "\n".join(b.text.strip() for b in blocks if b.text.strip())[:1000]
        try:
            detected_lang = await lid.identify(sample) if sample else "hi-IN"
        except Exception:
            detected_lang = "hi-IN"
    for block in blocks:
        block.language = detected_lang
    full_text = ocr_result.full_text

    return blocks, full_text, detected_lang, meta
