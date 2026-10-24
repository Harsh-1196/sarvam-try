import pytest
import respx
import httpx
from app.adapters.sarvam_lid import SarvamLID
from app.adapters.sarvam_translate import SarvamTranslate
from app.adapters.sarvam_translit import SarvamTranslit
from app.adapters.sarvam_llm import SarvamLLM
from app.adapters.sarvam_stt import SarvamSTT
from app.adapters.sarvam_tts import SarvamTTS
from app.adapters.tavily_client import TavilyClient


@pytest.mark.asyncio
@respx.mock
async def test_sarvam_lid_adapter():
    respx.post("https://api.sarvam.ai/text-lid").mock(
        return_value=httpx.Response(200, json={"language_code": "hi-IN", "script_code": "Deva"})
    )
    lid = SarvamLID(api_key="mock_key", base_url="https://api.sarvam.ai")
    lang = await lid.identify("आज का मुख्य समाचार")
    assert lang == "hi-IN"


@pytest.mark.asyncio
@respx.mock
async def test_sarvam_translate_adapter():
    respx.post("https://api.sarvam.ai/translate").mock(
        return_value=httpx.Response(200, json={"translated_text": "Today's headline"})
    )
    tr = SarvamTranslate(api_key="mock_key", base_url="https://api.sarvam.ai")
    translated = await tr.translate("आज का मुख्य समाचार", source="hi-IN", target="en-IN")
    assert translated == "Today's headline"


@pytest.mark.asyncio
@respx.mock
async def test_sarvam_translit_adapter():
    respx.post("https://api.sarvam.ai/transliterate").mock(
        return_value=httpx.Response(200, json={"transliterated_text": "namaste"})
    )
    translit = SarvamTranslit(api_key="mock_key", base_url="https://api.sarvam.ai")
    res = await translit.transliterate("नमस्ते", source="hi-IN", target="en-IN")
    assert res == "namaste"


@pytest.mark.asyncio
@respx.mock
async def test_sarvam_llm_json_adapter():
    respx.post("https://api.sarvam.ai/v1/chat/completions").mock(
        return_value=httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": '```json\n{"answer": "A statement", "source_ids": ["S1"], "insufficient_evidence": false}\n```',
                        }
                    }
                ]
            },
        )
    )
    llm = SarvamLLM(api_key="mock_key", base_url="https://api.sarvam.ai")
    data = await llm.chat_json(system="system", user="user")
    assert data["answer"] == "A statement"
    assert data["source_ids"] == ["S1"]
    assert data["insufficient_evidence"] is False


@pytest.mark.asyncio
@respx.mock
async def test_sarvam_stt_adapter():
    respx.post("https://api.sarvam.ai/speech-to-text").mock(
        return_value=httpx.Response(200, json={"transcript": "क्या हुआ था", "language_code": "hi-IN"})
    )
    stt = SarvamSTT(api_key="mock_key", base_url="https://api.sarvam.ai")
    t = await stt.transcribe(audio_bytes=b"dummy-audio-bytes" * 20, content_type="audio/webm")
    assert t.transcript == "क्या हुआ था"
    assert t.language_code == "hi-IN"


@pytest.mark.asyncio
@respx.mock
async def test_sarvam_tts_adapter():
    respx.post("https://api.sarvam.ai/text-to-speech").mock(
        return_value=httpx.Response(200, json={"audios": ["UklGRiQAAABXQVZF"]})
    )
    tts = SarvamTTS(api_key="mock_key", base_url="https://api.sarvam.ai")
    clip = await tts.speak(text="नमस्ते, आप कैसे हैं?", language="hi-IN")
    assert clip.mime == "audio/wav"
    assert clip.base64 == "UklGRiQAAABXQVZF"


@pytest.mark.asyncio
@respx.mock
async def test_tavily_search_and_extract():
    respx.post("https://api.tavily.com/search").mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {
                        "title": "Article Title",
                        "url": "https://example.com/news",
                        "content": "Sample content snippet",
                        "score": 0.95,
                        "published_date": "2026-10-20",
                    }
                ]
            },
        )
    )
    respx.post("https://api.tavily.com/extract").mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {
                        "url": "https://example.com/news",
                        "raw_content": "Full article body content here.",
                    }
                ]
            },
        )
    )
    client = TavilyClient(api_key="mock_tavily_key")
    results = await client.search("election results", start_date="2026-10-15", end_date="2026-10-22")
    assert len(results) == 1
    assert results[0].url == "https://example.com/news"

    extracted = await client.extract(["https://example.com/news"])
    assert len(extracted) == 1
    assert "Full article" in extracted[0].raw_content
