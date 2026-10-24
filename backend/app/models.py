from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


# Core data models
class Block(BaseModel):
    id: str  # "b1", "b2", ...
    text: str
    order: int
    bbox: list[float] | None = None
    block_type: str | None = None  # heading/paragraph/etc if provided
    language: str | None = None  # from LID


class HeadlineCandidate(BaseModel):
    id: str  # "h1".."h8"
    text: str  # exact text from OCR, never rewritten
    block_ids: list[str]
    confidence: float  # 0..1


class Source(BaseModel):
    id: str  # "S0".."S5"
    kind: Literal["uploaded_newspaper", "web"]
    title: str
    publisher: str | None = None
    url: str | None = None  # None for S0
    published_at: date | None = None
    language: str
    original_text: str
    model_text: str  # equals original_text unless pivoted
    machine_translated: bool = False
    cluster_id: str | None = None  # syndicated copies share an id
    image_url: str | None = None


class EvidenceItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_id: str
    quote: str  # verbatim substring of that source's model_text


class TimelineEvent(BaseModel):
    id: str  # "E1".. assigned by the server, not the LLM
    event_date: date | None = None
    date_precision: Literal["day", "month", "year", "unknown"] = "unknown"
    title: str
    description: str
    evidence: list[EvidenceItem] = Field(min_length=1)
    verification: Literal["verified", "unverified"] = "verified"
    image_url: str | None = None


class Position(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: str
    summary: str
    evidence: list[EvidenceItem] = Field(min_length=1)


class Perspective(BaseModel):
    topic: str
    status: Literal[
        "agreement",
        "different_emphasis",
        "factual_conflict",
        "insufficient_evidence",
    ]
    positions: list[Position]


class Story(BaseModel):
    headline: str
    language: str
    newspaper_date: date | None = None
    sources: list[Source]
    timeline: list[TimelineEvent]
    perspectives: list[Perspective]
    notices: list[str] = Field(default_factory=list)


# LLM-facing models (extra="forbid")
class LLMTimelineEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_date: str | None = None
    date_precision: Literal["day", "month", "year", "unknown"] = "unknown"
    title: str
    description: str
    evidence: list[EvidenceItem] = Field(default_factory=list)


class LLMPerspective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    topic: str
    status: Literal[
        "agreement",
        "different_emphasis",
        "factual_conflict",
        "insufficient_evidence",
    ]
    positions: list[Position] = Field(default_factory=list)


class LLMStoryPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    timeline: list[LLMTimelineEvent] = Field(default_factory=list)
    perspectives: list[LLMPerspective] = Field(default_factory=list)


class LLMHeadlineCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str
    block_ids: list[str]
    confidence: float


class LLMHeadlinesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    candidates: list[LLMHeadlineCandidate] = Field(default_factory=list)


class LLMQaResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answer: str
    source_ids: list[str] = Field(default_factory=list)
    insufficient_evidence: bool = False


class LLMEvidenceVerdict(BaseModel):
    model_config = ConfigDict(extra="forbid")
    index: int
    verdict: Literal["supported", "partial", "unsupported"]


class LLMEvidenceReviewResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    results: list[LLMEvidenceVerdict] = Field(default_factory=list)


# API Request/Response Models
class NewspaperUploadResponse(BaseModel):
    session_id: str
    stage: str = "ocr"
    status: str = "processing"


class NewspaperStatusResponse(BaseModel):
    status: Literal["processing", "ready", "failed"]
    stage: str
    ocr_text_excerpt: str | None = None
    detected_language: str | None = None
    candidates: list[HeadlineCandidate] = Field(default_factory=list)
    newspaper_date: str | None = None
    error: dict | None = None


class StoryCreateRequest(BaseModel):
    session_id: str
    headline: str
    newspaper_date: date | None = None
    display_language: str = "en-IN"
    newspaper_only: bool = False


class StoryStatusResponse(BaseModel):
    status: Literal["processing", "ready", "failed"]
    stage: str
    story: Story | None = None
    error: dict | None = None


class AudioPayload(BaseModel):
    mime: str
    base64: str
    chunks: list[str] = Field(default_factory=list)


class AskResponse(BaseModel):
    transcript: str | None = None
    answer: str
    source_ids: list[str] = Field(default_factory=list)
    insufficient_evidence: bool = False
    audio: AudioPayload | None = None
    audio_unavailable_reason: str | None = None


class TtsRequest(BaseModel):
    session_id: str | None = None
    text: str
    language: str


class TtsResponse(BaseModel):
    mime: str
    base64: str


class ArticleDetailRequest(BaseModel):
    session_id: str
    source_id: str
    target_language: str = "hi-IN"


class ArticleDetailResponse(BaseModel):
    source_id: str
    title: str
    translated_title: str
    publisher: str | None = None
    url: str | None = None
    published_date: str | None = None
    image_url: str | None = None
    original_text: str
    translated_text: str
    target_language: str
    summary: str
    audio_base64: str | None = None
    audio_mime: str | None = None
