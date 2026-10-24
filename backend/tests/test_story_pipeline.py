from datetime import date
import pytest
import respx
import httpx
from app.models import Source
from app.errors import AppError
from app.pipeline.story import StoryPipeline
from app.adapters.sarvam_llm import SarvamLLM
from app.adapters.sarvam_translate import SarvamTranslate

MOCK_SOURCES = [
    Source(
        id="S0",
        kind="uploaded_newspaper",
        title="India Launches Solar Mission",
        language="en-IN",
        original_text="ISRO successfully launched the solar observation satellite Aditya-L1 into orbit on Saturday morning.",
        model_text="ISRO successfully launched the solar observation satellite Aditya-L1 into orbit on Saturday morning.",
        machine_translated=False,
    ),
    Source(
        id="S1",
        kind="web",
        title="Global Space Review",
        language="en-IN",
        original_text="The satellite achieved halo orbit insertion around Lagrange point L1 after a four month journey across space.",
        model_text="The satellite achieved halo orbit insertion around Lagrange point L1 after a four month journey across space.",
        machine_translated=False,
        cluster_id="C1",
    ),
]


@pytest.mark.asyncio
@respx.mock
async def test_story_pipeline_happy_path():
    valid_json = {
        "timeline": [
            {
                "event_date": "2026-09-02",
                "date_precision": "day",
                "title": "Satellite Launch",
                "description": "Aditya-L1 was launched into orbit.",
                "evidence": [
                    {
                        "source_id": "S0",
                        "quote": "ISRO successfully launched the solar observation satellite Aditya-L1 into orbit on Saturday morning.",
                    }
                ],
            }
        ],
        "perspectives": [
            {
                "topic": "Mission Objectives",
                "status": "agreement",
                "positions": [
                    {
                        "label": "Scientific Value",
                        "summary": "Observation of solar flares",
                        "evidence": [
                            {
                                "source_id": "S1",
                                "quote": "The satellite achieved halo orbit insertion around Lagrange point L1 after a four month journey across space.",
                            }
                        ],
                    }
                ],
            }
        ],
    }

    respx.post("https://api.sarvam.ai/v1/chat/completions").mock(
        return_value=httpx.Response(
            200,
            json={"choices": [{"message": {"role": "assistant", "content": str(valid_json).replace("'", '"')}}]},
        )
    )

    llm = SarvamLLM(api_key="mock", base_url="https://api.sarvam.ai")
    tr = SarvamTranslate(api_key="mock", base_url="https://api.sarvam.ai")
    pipeline = StoryPipeline(llm=llm, translate=tr)

    story = await pipeline.generate_and_validate(
        headline="India Launches Solar Mission",
        newspaper_date="2026-09-02",
        display_language="en-IN",
        sources=MOCK_SOURCES,
    )

    assert story.headline == "India Launches Solar Mission"
    assert len(story.timeline) == 1
    assert story.timeline[0].id == "E1"
    assert len(story.perspectives) == 1


@pytest.mark.asyncio
@respx.mock
async def test_story_pipeline_invalid_json_then_repaired():
    valid_json_str = '{"timeline": [{"event_date": "2026-09-02", "date_precision": "day", "title": "Launch", "description": "Desc", "evidence": [{"source_id": "S0", "quote": "ISRO successfully launched the solar observation satellite Aditya-L1 into orbit on Saturday morning."}]}], "perspectives": []}'

    route = respx.post("https://api.sarvam.ai/v1/chat/completions")
    # First response invalid JSON, second response valid JSON
    route.side_effect = [
        httpx.Response(200, json={"choices": [{"message": {"role": "assistant", "content": "Bad {json not closed"}}]}),
        httpx.Response(200, json={"choices": [{"message": {"role": "assistant", "content": valid_json_str}}]}),
    ]

    llm = SarvamLLM(api_key="mock", base_url="https://api.sarvam.ai")
    tr = SarvamTranslate(api_key="mock", base_url="https://api.sarvam.ai")
    pipeline = StoryPipeline(llm=llm, translate=tr)

    story = await pipeline.generate_and_validate(
        headline="India Launches Solar Mission",
        newspaper_date="2026-09-02",
        display_language="en-IN",
        sources=MOCK_SOURCES,
    )
    assert len(story.timeline) == 1


@pytest.mark.asyncio
@respx.mock
async def test_story_pipeline_invalid_twice_raises_error():
    route = respx.post("https://api.sarvam.ai/v1/chat/completions")
    route.side_effect = [
        httpx.Response(200, json={"choices": [{"message": {"role": "assistant", "content": "Bad json 1"}}]}),
        httpx.Response(200, json={"choices": [{"message": {"role": "assistant", "content": "Bad json 2"}}]}),
    ]

    llm = SarvamLLM(api_key="mock", base_url="https://api.sarvam.ai")
    tr = SarvamTranslate(api_key="mock", base_url="https://api.sarvam.ai")
    pipeline = StoryPipeline(llm=llm, translate=tr)

    with pytest.raises(AppError) as exc_info:
        await pipeline.generate_and_validate(
            headline="Headline",
            newspaper_date=None,
            display_language="en-IN",
            sources=MOCK_SOURCES,
        )
    assert exc_info.value.code == "LLM_INVALID_JSON"
