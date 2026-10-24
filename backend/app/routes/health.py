from fastapi import APIRouter
from app.config import settings

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "demo_mode": settings.DEMO_MODE,
        "models": {
            "llm": settings.LLM_MODEL,
            "stt": settings.STT_MODEL,
            "tts": settings.TTS_MODEL,
            "translate": settings.TRANSLATE_MODEL,
        },
    }
