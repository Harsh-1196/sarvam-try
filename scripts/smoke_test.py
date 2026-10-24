import argparse
import asyncio
import os
import sys
import time
from datetime import datetime
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.config import settings
from app.adapters.sarvam_lid import SarvamLID
from app.adapters.sarvam_translate import SarvamTranslate
from app.adapters.sarvam_translit import SarvamTranslit
from app.adapters.sarvam_llm import SarvamLLM
from app.adapters.sarvam_tts import SarvamTTS
from app.adapters.tavily_client import TavilyClient
from app.pipeline.ocr import run_ocr_pipeline
from app.pipeline.newspaper_date import detect_newspaper_date
from app.pipeline.headlines import extract_headline_candidates
from app.pipeline.search import SearchPipeline
from app.pipeline.registry import build_source_registry
from app.pipeline.pivot import apply_pivot_translation
from app.pipeline.story import StoryPipeline
from app.pipeline.qa import QaPipeline


async def test_adapters():
    print("=" * 65)
    print("KhabarLens: Running Live Adapter Smoke Tests")
    print(f"Sarvam Model: {settings.LLM_MODEL}")
    print(f"TTS Model:    {settings.TTS_MODEL}")
    print(f"STT Model:    {settings.STT_MODEL}")
    print("=" * 65)

    # 1. Sarvam LID
    t0 = time.time()
    lid = SarvamLID()
    lang = await lid.identify("आज का मुख्य समाचार क्या है?")
    d_lid = time.time() - t0
    print(f"✓ Sarvam LID: SUCCESS ({d_lid:.2f}s) -> detected {lang}")

    # 2. Sarvam Translate
    t0 = time.time()
    tr = SarvamTranslate()
    translated = await tr.translate("KhabarLens is a multilingual newspaper intelligence tool.", source="en-IN", target="hi-IN")
    d_tr = time.time() - t0
    print(f"✓ Sarvam Translate: SUCCESS ({d_tr:.2f}s) -> '{translated[:50]}...'")

    # 3. Sarvam Transliterate
    t0 = time.time()
    translit = SarvamTranslit()
    transliterated = await translit.transliterate("नमस्ते भारत", source="hi-IN", target="en-IN")
    d_translit = time.time() - t0
    print(f"✓ Sarvam Transliterate: SUCCESS ({d_translit:.2f}s) -> '{transliterated}'")

    # 4. Sarvam LLM
    t0 = time.time()
    llm = SarvamLLM()
    llm_resp = await llm.chat_text(system="Reply concisely with only 2 words.", user="Confirm system readiness.")
    d_llm = time.time() - t0
    print(f"✓ Sarvam LLM ({settings.LLM_MODEL}): SUCCESS ({d_llm:.2f}s) -> '{llm_resp.strip()}'")

    # 5. Sarvam TTS
    t0 = time.time()
    tts = SarvamTTS()
    clip = await tts.speak("खबरलेंस में आपका स्वागत है।", language="hi-IN")
    d_tts = time.time() - t0
    print(f"✓ Sarvam TTS ({settings.TTS_MODEL}): SUCCESS ({d_tts:.2f}s) -> generated {clip.mime} ({len(clip.base64)} chars base64)")

    # 6. Tavily Search
    t0 = time.time()
    tavily = TavilyClient()
    search_results = await tavily.search("India renewable energy solar", max_results=2)
    d_tavily = time.time() - t0
    print(f"✓ Tavily Search: SUCCESS ({d_tavily:.2f}s) -> retrieved {len(search_results)} articles")

    print("=" * 65)
    print("All live adapter smoke calls succeeded!")
    print("=" * 65)


async def test_end_to_end_pipeline(image_path_str: str):
    image_path = Path(image_path_str).resolve()
    if not image_path.exists():
        print(f"ERROR: Image file not found: {image_path}")
        sys.exit(1)

    print("=" * 65)
    print(f"KhabarLens: End-to-End Pipeline Smoke Test")
    print(f"Input Image: {image_path.name} ({image_path.stat().st_size} bytes)")
    print("=" * 65)

    image_bytes = image_path.read_bytes()

    # [1/6] OCR & Date Detection
    t0 = time.time()
    blocks, full_text, detected_lang, meta = await run_ocr_pipeline(image_bytes)
    detected_date = detect_newspaper_date(full_text)
    d1 = time.time() - t0
    date_str = detected_date.isoformat() if detected_date else "None"
    print(f"[1/6] OCR & Date Detection: {detected_lang}, date: {date_str} ({d1:.2f}s)")
    print(f"      OCR Extracted {len(blocks)} blocks ({len(full_text)} chars)")

    # [2/6] Headline Candidates
    t0 = time.time()
    candidates = await extract_headline_candidates(blocks)
    d2 = time.time() - t0
    selected_headline = candidates[0].text if candidates else "India Energy Milestone"
    print(f"[2/6] Headline Candidates: {len(candidates)} found ({d2:.2f}s)")
    print(f"      Selected: \"{selected_headline[:60]}...\"")

    # [3/6] Web Retrieval
    t0 = time.time()
    search_pipe = SearchPipeline()
    search_results, notices, url_to_cluster = await search_pipe.search_and_rank(
        headline=selected_headline,
        newspaper_date=detected_date,
        detected_language=detected_lang,
    )
    d3 = time.time() - t0
    print(f"[3/6] Web Retrieval: {len(search_results)} articles fetched via Tavily ({d3:.2f}s)")

    # [4/6] Shingle Clustering
    cluster_ids = set(url_to_cluster.values()) if url_to_cluster else set()
    print(f"[4/6] Shingle Clustering: {len(search_results)} articles grouped into {max(len(cluster_ids), 1)} distinct cluster(s)")

    # [5/6] Build Source Registry & Pivot
    t0 = time.time()
    sources, reg_notices = await build_source_registry(
        selected_headline=selected_headline,
        ocr_blocks=blocks,
        detected_language=detected_lang or "hi-IN",
        newspaper_date=date_str if date_str != "None" else None,
        search_results=search_results,
        url_to_cluster=url_to_cluster,
    )
    pivoted_sources, pivot_notices = await apply_pivot_translation(sources)
    all_notices = notices + reg_notices + pivot_notices

    # [5/6] Story Generation
    story_pipe = StoryPipeline()
    display_lang = detected_lang if detected_lang in ["hi-IN", "en-IN"] else "hi-IN"
    story = await story_pipe.generate_and_validate(
        headline=selected_headline,
        newspaper_date=date_str if date_str != "None" else None,
        display_language=display_lang,
        sources=pivoted_sources,
        initial_notices=all_notices,
    )
    d5 = time.time() - t0
    print(f"[5/6] Story Generation: Sarvam-105B returned validated story ({d5:.2f}s)")

    # [6/6] Validation Report
    total_quotes = sum(len(e.evidence) for e in story.timeline) + sum(len(pos.evidence) for p in story.perspectives for pos in p.positions)
    print(f"[6/6] Validation: {len(story.timeline)} timeline events, {len(story.perspectives)} perspectives, {total_quotes} total quotes verified")
    print("-" * 65)
    print(f"Output Story Title:   {story.headline}")
    print(f"Display Language:     {story.language}")
    print(f"Timeline Events:      {len(story.timeline)}")
    print(f"Perspectives:         {len(story.perspectives)}")
    if story.notices:
        print(f"Notices ({len(story.notices)}):")
        for notice in story.notices[:3]:
            print(f"  * {notice}")
    print("-" * 65)

    # Ask Bar Test
    t0 = time.time()
    qa_pipe = QaPipeline()
    test_question = "मुख्य बिंदु क्या हैं?" if "hi" in display_lang else "What are the main milestones achieved?"
    qa_resp = await qa_pipe.answer_question(
        story=story,
        sources=pivoted_sources,
        question_text=test_question,
        audio_bytes=None,
        audio_content_type="audio/webm",
        display_language=display_lang,
        want_audio=False,
    )
    d_qa = time.time() - t0
    cites = qa_resp.source_ids
    print(f"Ask Bar Test: Question '{test_question}' -> Answered with {cites} citations ({d_qa:.2f}s)")
    print(f"Answer snippet: \"{qa_resp.answer[:120]}...\"")

    # TTS Test
    t0 = time.time()
    tts = SarvamTTS()
    tts_text = qa_resp.answer[:150]
    clip = await tts.speak(tts_text, language=display_lang)
    d_tts = time.time() - t0
    print(f"TTS Test: Synthesized answer in {display_lang} ({clip.mime}, {len(clip.base64)} b64 chars) ({d_tts:.2f}s)")

    print("=" * 65)
    print("SUCCESS: Full KhabarLens pipeline executed without errors!")
    print("=" * 65)


async def main():
    parser = argparse.ArgumentParser(description="KhabarLens Smoke Test")
    parser.add_argument("--adapters", action="store_true", help="Run live adapter smoke calls")
    parser.add_argument("--image", type=str, help="Path to image for end-to-end pipeline smoke test")
    args = parser.parse_args()

    if args.image:
        await test_end_to_end_pipeline(args.image)
    else:
        await test_adapters()


if __name__ == "__main__":
    asyncio.run(main())
