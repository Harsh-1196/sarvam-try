import asyncio
from datetime import datetime, timedelta, timezone
import secrets
from typing import Literal
from pydantic import BaseModel, Field

from app.models import (
    Block,
    HeadlineCandidate,
    Source,
    Story,
)
from app.errors import AppError


class SessionData(BaseModel):
    id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_accessed: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    stage: str = "ocr"
    status: Literal["processing", "ready", "failed"] = "processing"
    error: dict | None = None
    image_meta: dict | None = None
    ocr_blocks: list[Block] = Field(default_factory=list)
    ocr_text: str = ""
    detected_language: str | None = None
    candidates: list[HeadlineCandidate] = Field(default_factory=list)
    selected_headline: str | None = None
    newspaper_date: str | None = None  # YYYY-MM-DD or None
    sources: list[Source] = Field(default_factory=list)
    story: Story | None = None
    display_language: str = "en-IN"


class SessionStore:
    def __init__(self, ttl_minutes: int = 60):
        self.ttl_minutes = ttl_minutes
        self._sessions: dict[str, SessionData] = {}
        self._locks: dict[str, asyncio.Lock] = {}
        self._global_lock = asyncio.Lock()
        self._cleaner_task: asyncio.Task | None = None

    def create_session(self) -> SessionData:
        sid = secrets.token_urlsafe(24)
        session = SessionData(id=sid)
        self._sessions[sid] = session
        self._locks[sid] = asyncio.Lock()
        return session

    def get_session(self, session_id: str) -> SessionData:
        session = self._sessions.get(session_id)
        if not session:
            raise AppError("SESSION_NOT_FOUND", "Session not found", status_code=404)
        now = datetime.now(timezone.utc)
        if now - session.last_accessed > timedelta(minutes=self.ttl_minutes):
            self.delete_session(session_id)
            raise AppError("SESSION_EXPIRED", "Session has expired", status_code=410)
        session.last_accessed = now
        return session

    def get_lock(self, session_id: str) -> asyncio.Lock:
        if session_id not in self._locks:
            self._locks[session_id] = asyncio.Lock()
        return self._locks[session_id]

    def delete_session(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)
        self._locks.pop(session_id, None)

    async def purge_expired(self) -> int:
        now = datetime.now(timezone.utc)
        expired_ids = [
            sid
            for sid, s in self._sessions.items()
            if now - s.last_accessed > timedelta(minutes=self.ttl_minutes)
        ]
        for sid in expired_ids:
            self.delete_session(sid)
        return len(expired_ids)

    async def _cleaner_loop(self) -> None:
        while True:
            try:
                await asyncio.sleep(60)
                await self.purge_expired()
            except asyncio.CancelledError:
                break
            except Exception:
                pass

    def start_cleaner(self) -> None:
        if self._cleaner_task is None or self._cleaner_task.done():
            self._cleaner_task = asyncio.create_task(self._cleaner_loop())

    def stop_cleaner(self) -> None:
        if self._cleaner_task and not self._cleaner_task.done():
            self._cleaner_task.cancel()


session_store = SessionStore()
