import asyncio
from app.models import Source
from app.adapters.sarvam_translate import SarvamTranslate
from app.pipeline.languages import should_pivot


async def apply_pivot_translation(
    sources: list[Source],
    translate: SarvamTranslate | None = None,
) -> tuple[list[Source], list[str]]:
    """
    Pivot Rule:
    If a source's language is outside LLM_STRONG_LANGS (11 languages),
    create a translated English copy (stored in model_text, with machine_translated=True).
    The LLM only ever sees model_text.
    If translation fails for a source that requires pivoting, drop it and add a notice.
    """
    if translate is None:
        translate = SarvamTranslate()

    valid_sources: list[Source] = []
    notices: list[str] = []
    sem = asyncio.Semaphore(3)

    async def pivot_one(source: Source) -> Source | None:
        if not should_pivot(source.language):
            source.model_text = source.original_text
            source.machine_translated = False
            return source

        async with sem:
            try:
                translated_en = await translate.translate(
                    source.original_text,
                    source=source.language,
                    target="en-IN",
                )
                if not translated_en or len(translated_en.strip()) < 50:
                    notices.append(f"Source {source.id} dropped: pivot translation returned empty result.")
                    return None
                source.model_text = translated_en
                source.machine_translated = True
                notices.append(f"Source {source.id} pivoted to English for LLM comprehension ({source.language} -> en-IN)")
                return source
            except Exception as e:
                notices.append(f"Source {source.id} dropped: failed pivot translation ({str(e)})")
                return None

    tasks = [pivot_one(s) for s in sources]
    results = await asyncio.gather(*tasks)

    for r in results:
        if r is not None:
            valid_sources.append(r)

    return valid_sources, notices
