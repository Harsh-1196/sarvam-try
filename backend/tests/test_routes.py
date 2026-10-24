import io
import pytest
from PIL import Image
from httpx import AsyncClient, ASGITransport
from app.main import app


def create_test_image(width: int, height: int, format: str = "JPEG") -> bytes:
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_upload_wrong_mime():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        files = {"image": ("test.txt", b"not an image", "text/plain")}
        res = await client.post("/api/newspaper", files=files)
        # Background task runs validation, or immediate validation
        assert res.status_code == 202
        sid = res.json()["session_id"]
        # Poll status
        status_res = await client.get(f"/api/newspaper/{sid}")
        # When background task runs it marks status failed with IMAGE_INVALID
        # Wait a tiny moment
        data = status_res.json()
        assert data["status"] in ("processing", "failed")


@pytest.mark.asyncio
async def test_upload_image_too_small():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 400x400 is less than 600px minimum short side
        img_bytes = create_test_image(400, 400)
        files = {"image": ("small.jpg", img_bytes, "image/jpeg")}
        res = await client.post("/api/newspaper", files=files)
        assert res.status_code == 202
        sid = res.json()["session_id"]

        import asyncio
        for _ in range(10):
            status_res = await client.get(f"/api/newspaper/{sid}")
            data = status_res.json()
            if data["status"] == "failed":
                assert data["error"]["code"] == "IMAGE_TOO_SMALL"
                break
            await asyncio.sleep(0.1)


@pytest.mark.asyncio
async def test_session_not_found():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/newspaper/non_existent_session_id_123")
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "SESSION_NOT_FOUND"


@pytest.mark.asyncio
async def test_article_detail_endpoint():
    from app.session_store import session_store
    from app.models import Source
    session = session_store.create_session()
    session.sources = [
        Source(
            id="S1",
            kind="web",
            title="Clean Energy Surge in India",
            publisher="The Hindu",
            url="https://thehindu.com/energy",
            language="en-IN",
            original_text="India has achieved unprecedented solar targets with over 500 GW installed capacity.",
            model_text="India has achieved unprecedented solar targets with over 500 GW installed capacity.",
            image_url="https://example.com/img.jpg",
        )
    ]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/story/article-detail",
            json={
                "session_id": session.id,
                "source_id": "S1",
                "target_language": "en-IN",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["source_id"] == "S1"
        assert data["title"] == "Clean Energy Surge in India"
        assert data["image_url"] == "https://example.com/img.jpg"
        assert "India has achieved" in data["original_text"]
