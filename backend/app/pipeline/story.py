from datetime import date
from pathlib import Path
from app.config import settings
from app.errors import AppError
from app.models import Source, Story, TimelineEvent, Perspective
from app.adapters.sarvam_llm import SarvamLLM
from app.adapters.sarvam_translate import SarvamTranslate
from app.pipeline.validate import validate_story_data
from app.pipeline.languages import LLM_STRONG_LANGS, normalize_lang_code

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


def format_sources_for_prompt(sources: list[Source]) -> str:
    """Formats source records strictly as specified in Section 9.7."""
    blocks = []
    for s in sources:
        pub_at = s.published_at.isoformat() if s.published_at else "unknown"
        block = f"[{s.id}] title={s.title} | publisher={s.publisher or 'unknown'} | published_at={pub_at} | language={s.language}\n<<<\n{s.model_text}\n>>>"
        blocks.append(block)
    return "\n\n".join(blocks)


async def translate_story_display(
    story: Story,
    target_language: str,
    translate: SarvamTranslate,
) -> Story:
    """
    Translates story text fields (titles, descriptions, labels, summaries, topics)
    to target_language. Quotes and original source titles are never translated.
    """
    norm_target = normalize_lang_code(target_language)
    if story.language == norm_target:
        return story

    # Collect texts to translate in order
    texts: list[str] = []

    # Timeline titles and descriptions
    for e in story.timeline:
        texts.append(e.title)
        texts.append(e.description)

    # Perspective topics and positions
    for p in story.perspectives:
        texts.append(p.topic)
        for pos in p.positions:
            texts.append(pos.label)
            texts.append(pos.summary)

    # Translate joined strings
    separator = " \n---SECTION_BREAK---\n "
    joined = separator.join(texts)
    try:
        translated_joined = await translate.translate(
            joined,
            source=story.language,
            target=norm_target,
        )
        translated_parts = [t.strip() for t in translated_joined.split("---SECTION_BREAK---")]
        if len(translated_parts) == len(texts):
            idx = 0
            for e in story.timeline:
                e.title = translated_parts[idx]
                e.description = translated_parts[idx + 1]
                idx += 2
            for p in story.perspectives:
                p.topic = translated_parts[idx]
                idx += 1
                for pos in p.positions:
                    pos.label = translated_parts[idx]
                    pos.summary = translated_parts[idx + 1]
                    idx += 2
            story.language = norm_target
    except Exception:
        # Fall back gracefully to generation language if display translation fails
        pass

    return story


class StoryPipeline:
    def __init__(
        self,
        llm: SarvamLLM | None = None,
        translate: SarvamTranslate | None = None,
    ):
        self.llm = llm or SarvamLLM()
        self.translate = translate or SarvamTranslate()

    async def generate_and_validate(
        self,
        headline: str,
        newspaper_date: str | None,
        display_language: str,
        sources: list[Source],
        initial_notices: list[str] | None = None,
    ) -> Story:
        """
        Runs full Story Generation:
        1. Prepares prompt with sources
        2. Calls Sarvam-105B with repair retry
        3. Validates timeline quotes and perspectives
        4. Applies display language translation
        """
        notices = list(initial_notices or [])
        today_date = date.today().isoformat()
        norm_display = normalize_lang_code(display_language)

        # Decide generation language: use display language if in LLM_STRONG_LANGS, else en-IN
        gen_language = norm_display if norm_display in LLM_STRONG_LANGS else "en-IN"

        # Load prompts
        with open(PROMPTS_DIR / "story_system.txt", "r", encoding="utf-8") as f:
            system_template = f.read()
        system_prompt = system_template.replace("{{OUTPUT_LANGUAGE}}", gen_language)

        with open(PROMPTS_DIR / "story_user_template.txt", "r", encoding="utf-8") as f:
            user_template = f.read()

        sources_block = format_sources_for_prompt(sources)
        user_prompt = (
            user_template.replace("{{HEADLINE}}", headline)
            .replace("{{NEWSPAPER_DATE}}", newspaper_date or "unknown")
            .replace("{{TODAY_DATE}}", today_date)
            .replace("{{OUTPUT_LANGUAGE}}", gen_language)
            .replace("{{SOURCES_BLOCK}}", sources_block)
        )

        # First LLM call
        try:
            raw_data = await self.llm.chat_json(
                system=system_prompt,
                user=user_prompt,
                temperature=0.1,
                max_tokens=3000,
            )
        except Exception as e:
            # One repair retry with error explanation
            repair_user = f"{user_prompt}\n\nREPAIR INSTRUCTION: Your previous output failed JSON decode: {str(e)}. Return strictly valid JSON adhering to the specified schema."
            raw_data = await self.llm.chat_json(
                system=system_prompt,
                user=repair_user,
                temperature=0.1,
                max_tokens=3000,
            )

        raw_timeline = raw_data.get("timeline", [])
        raw_perspectives = raw_data.get("perspectives", [])

        # Validate story data
        valid_timeline, valid_perspectives, val_notices = await validate_story_data(
            raw_timeline=raw_timeline,
            raw_perspectives=raw_perspectives,
            sources=sources,
            today=date.today(),
            evidence_review=settings.EVIDENCE_REVIEW,
            llm=self.llm,
        )
        notices.extend(val_notices)

        if not valid_timeline and not valid_perspectives:
            raise AppError(
                "NO_SOURCES",
                "Not enough supported information across available sources to construct a verified story.",
                status_code=422,
                retryable=False,
            )

        parsed_np_date = None
        if newspaper_date:
            try:
                from datetime import datetime
                parsed_np_date = datetime.strptime(newspaper_date, "%Y-%m-%d").date()
            except Exception:
                pass

        story = Story(
            headline=headline,
            language=gen_language,
            newspaper_date=parsed_np_date,
            sources=sources,
            timeline=valid_timeline,
            perspectives=valid_perspectives,
            notices=notices,
        )

        # If display language differs from generation language, translate
        if norm_display != gen_language:
            story = await translate_story_display(story, norm_display, self.translate)

        return story
