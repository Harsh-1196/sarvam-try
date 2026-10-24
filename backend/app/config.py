from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
import sys


class Settings(BaseSettings):
    SARVAM_API_KEY: str = ""
    TAVILY_API_KEY: str = ""
    SARVAM_BASE_URL: str = "https://api.sarvam.ai"
    ALLOWED_ORIGINS: str = "http://localhost:5173"
    MAX_UPLOAD_MB: int = 10
    SESSION_TTL_MINUTES: int = 60
    DEMO_MODE: bool = False
    LLM_MODEL: str = "sarvam-105b-conversations"
    STT_MODEL: str = "saaras:v4"
    TTS_MODEL: str = "bulbul:v4-flash"
    TRANSLATE_MODEL: str = "sarvam-translate:v1"
    EVIDENCE_REVIEW: bool = True

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_keys(self) -> "Settings":
        if not self.DEMO_MODE:
            missing = []
            if not self.SARVAM_API_KEY.strip():
                missing.append("SARVAM_API_KEY")
            if not self.TAVILY_API_KEY.strip():
                missing.append("TAVILY_API_KEY")
            if missing:
                sys.stderr.write(
                    f"Configuration Error: Required environment variable(s) missing: {', '.join(missing)}. "
                    f"Set them in .env or run with DEMO_MODE=true.\n"
                )
                raise ValueError(f"Missing required API key(s): {', '.join(missing)}")
        return self


settings = Settings()
