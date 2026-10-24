import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "demo_mode" in data
        assert data["models"]["llm"] == "sarvam-105b-conversations"
        assert data["models"]["stt"] == "saaras:v4"
        assert data["models"]["tts"] == "bulbul:v4-flash"
