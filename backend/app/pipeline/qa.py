import json
from pathlib import Path
from app.config import settings
from app.errors import AppError
from app.models import AskResponse, AudioPayload, Story, Source
from app.adapters.sarvam_stt import SarvamSTT
from app.adapters.sarvam_llm import SarvamLLM
from app.adapters.sarvam_tts import SarvamTTS
from app.adapters.sarvam_translate import SarvamTranslate
from app.pipeline.registry import truncate_article_to_relevant_paragraphs
from app.pipeline.languages import LLM_STRONG_LANGS, is_tts_supported, normalize_lang_code

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


class QaPipeline:
    def __init__(
        self,
        stt: SarvamSTT | None = None,
        llm: SarvamLLM | None = None,
        tts: SarvamTTS | None = None,
        translate: SarvamTranslate | None = None,
    ):
        self.stt = stt or SarvamSTT()
        self.llm = llm or SarvamLLM()
        self.tts = tts or SarvamTTS()
        self.translate = translate or SarvamTranslate()

    async def answer_question(
        self,
        story: Story,
        sources: list[Source],
        question_text: str | None = None,
        audio_bytes: bytes | None = None,
        audio_content_type: str = "audio/webm",
        display_language: str = "hi-IN",
        want_audio: bool = True,
    ) -> AskResponse:
        """
        Executes grounded Q&A workflow:
        1. Transcribes audio if provided via Saaras STT
        2. Scores and selects 3,000 char excerpts of each source relevant to question
        3. Calls Sarvam-105B with qa_system.txt
        4. Validates source citations & insufficient_evidence rule
        5. Synthesizes spoken audio via Bulbul TTS
        """
        transcript = None
        norm_display = normalize_lang_code(display_language)

        # 1. Transcribe audio if provided
        if audio_bytes:
            stt_res = await self.stt.transcribe(
                audio_bytes=audio_bytes,
                content_type=audio_content_type,
                language_hint=norm_display,
                mode="codemix",
            )
            transcript = stt_res.transcript
            if not transcript or len(transcript.strip()) < 3:
                raise AppError(
                    "STT_FAILED",
                    "We couldn't hear any clear question in the audio recording. Please speak clearly and try again.",
                    status_code=400,
                    retryable=True,
                )
            query = transcript.strip()
            # Delete audio bytes immediately after STT (Section 7)
            del audio_bytes
        elif question_text:
            query = question_text.strip()
        else:
            raise AppError("INVALID_REQUEST", "Either audio recording or text question must be provided.", status_code=400)

        # 2. Build context
        source_map = {s.id: s for s in sources}
        source_excerpts = []
        for s in sources:
            rel_excerpt = truncate_article_to_relevant_paragraphs(s.model_text, query, max_chars=3000)
            source_excerpts.append(f"[{s.id}] {s.title} ({s.publisher or 'Source'}):\n{rel_excerpt}")

        context_sources = "\n\n".join(source_excerpts)
        story_summary = {
            "headline": story.headline,
            "newspaper_date": story.newspaper_date.isoformat() if story.newspaper_date else "unknown",
            "timeline": [{"id": e.id, "date": str(e.event_date), "title": e.title} for e in story.timeline],
            "perspectives": [{"topic": p.topic, "status": p.status} for p in story.perspectives],
        }

        # 3. Call Sarvam-105B
        with open(PROMPTS_DIR / "qa_system.txt", "r", encoding="utf-8") as f:
            system_template = f.read()

        gen_language = norm_display if norm_display in LLM_STRONG_LANGS else "en-IN"
        system_prompt = system_template.replace("{{OUTPUT_LANGUAGE}}", gen_language)

        user_content = f"Story Summary:\n{json.dumps(story_summary, ensure_ascii=False)}\n\nSources:\n{context_sources}\n\nQuestion: {query}"

        qa_data = await self.llm.chat_json(
            system=system_prompt,
            user=user_content,
            temperature=0.1,
            max_tokens=500,
        )

        raw_answer = qa_data.get("answer", "").strip()
        raw_source_ids = qa_data.get("source_ids", [])
        insufficient = bool(qa_data.get("insufficient_evidence", False))

        # Validate source IDs exist
        valid_source_ids = [sid for sid in raw_source_ids if sid in source_map]

        # If model claimed evidence but cited 0 valid sources, mark insufficient
        if not insufficient and not valid_source_ids:
            insufficient = True
            raw_answer = "The available newspaper and web sources do not contain sufficient evidence to answer this question."

        # If display language differs from generation language, translate answer
        final_answer = raw_answer
        if norm_display != gen_language:
            try:
                final_answer = await self.translate.translate(
                    raw_answer, source=gen_language, target=norm_display
                )
            except Exception:
                final_answer = raw_answer

        # 4. Synthesize Audio
        audio_payload = None
        audio_reason = None

        if want_audio:
            if not is_tts_supported(norm_display):
                audio_reason = "language_not_supported_by_tts"
            else:
                try:
                    clip = await self.tts.speak(final_answer, language=norm_display)
                    audio_payload = AudioPayload(
                        mime=clip.mime,
                        base64=clip.base64,
                        chunks=clip.chunks,
                    )
                except Exception as e:
                    audio_reason = f"TTS synthesis temporarily unavailable: {str(e)}"

        return AskResponse(
            transcript=transcript,
            answer=final_answer,
            source_ids=valid_source_ids,
            insufficient_evidence=insufficient,
            audio=audio_payload,
            audio_unavailable_reason=audio_reason,
        )
