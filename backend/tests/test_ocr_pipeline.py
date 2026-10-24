import io

import pytest
from PIL import Image

from app.adapters.sarvam_vision import OcrResult
from app.errors import AppError
from app.models import Block
from app.pipeline.ocr import run_ocr_pipeline, validate_and_preprocess_image


def make_image(format: str = "JPEG", size: tuple[int, int] = (900, 1200)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, "white").save(buffer, format=format)
    return buffer.getvalue()


class FakeVision:
    def __init__(self, blocks=None):
        self.blocks = blocks or [
            Block(id="b1", text="Readable newspaper article text " * 4, order=0),
            Block(id="b2", text="Another paragraph with enough text " * 4, order=1),
        ]

    async def digitise(self, image_bytes, mime, language_hint):
        return OcrResult(blocks=self.blocks, full_text="\n".join(b.text for b in self.blocks))


class FakeLid:
    def __init__(self, result="en-IN", error=None):
        self.result = result
        self.error = error
        self.calls = []

    async def identify(self, text):
        self.calls.append(text)
        if self.error:
            raise self.error
        return self.result


@pytest.mark.asyncio
async def test_auto_language_detection_uses_one_representative_call():
    lid = FakeLid("hi-IN")
    blocks, _, lang, _ = await run_ocr_pipeline(make_image(), vision=FakeVision(), lid=lid)
    assert lang == "hi-IN"
    assert len(lid.calls) == 1
    assert all(block.language == "hi-IN" for block in blocks)


@pytest.mark.asyncio
async def test_language_hint_skips_language_detection():
    lid = FakeLid()
    blocks, _, lang, _ = await run_ocr_pipeline(
        make_image(), language_hint="en-IN", vision=FakeVision(), lid=lid
    )
    assert lang == "en-IN"
    assert lid.calls == []
    assert all(block.language == "en-IN" for block in blocks)


@pytest.mark.asyncio
async def test_lid_failure_falls_back_without_losing_ocr_text():
    lid = FakeLid(error=RuntimeError("provider unavailable"))
    blocks, full_text, lang, _ = await run_ocr_pipeline(
        make_image(), vision=FakeVision(), lid=lid
    )
    assert lang == "hi-IN"
    assert full_text
    assert blocks


def test_webp_is_supported_and_normalized():
    processed, mime, _ = validate_and_preprocess_image(make_image("WEBP"))
    assert mime == "image/png"
    with Image.open(io.BytesIO(processed)) as image:
        assert image.format == "PNG"


def test_corrupt_image_is_rejected():
    with pytest.raises(AppError) as err:
        validate_and_preprocess_image(b"not an image")
    assert err.value.code == "IMAGE_INVALID"
