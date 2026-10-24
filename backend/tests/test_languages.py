from app.pipeline.languages import (
    normalize_lang_code,
    should_pivot,
    is_tts_supported,
    get_tts_speaker,
    LLM_STRONG_LANGS,
    BULBUL_LANGS,
    VISION_LANGS,
)


def test_normalize_language_codes():
    assert normalize_lang_code("hi") == "hi-IN"
    assert normalize_lang_code("HI_IN") == "hi-IN"
    assert normalize_lang_code("en-in") == "en-IN"
    assert normalize_lang_code("bn") == "bn-IN"
    assert normalize_lang_code("ur") == "ur-IN"
    assert normalize_lang_code(None) == "hi-IN"


def test_pivot_rule_decisions():
    # 11 strong LLM languages should NOT pivot
    assert should_pivot("hi-IN") is False
    assert should_pivot("en-IN") is False
    assert should_pivot("bn-IN") is False
    assert should_pivot("ta-IN") is False
    assert should_pivot("te-IN") is False

    # Languages outside 11 strong languages MUST pivot to English
    assert should_pivot("as-IN") is True  # Assamese
    assert should_pivot("ur-IN") is True  # Urdu
    assert should_pivot("ne-IN") is True  # Nepali
    assert should_pivot("sa-IN") is True  # Sanskrit
    assert should_pivot("kok-IN") is True # Konkani
    assert should_pivot("mai-IN") is True # Maithili


def test_tts_support_decisions():
    # Bulbul supports the 11 primary languages
    for lang in ["hi-IN", "en-IN", "bn-IN", "gu-IN", "mr-IN", "ta-IN", "te-IN"]:
        assert is_tts_supported(lang) is True

    # Bulbul does NOT support other Indic languages
    for lang in ["ur-IN", "ne-IN", "sa-IN", "as-IN", "kok-IN", "mai-IN"]:
        assert is_tts_supported(lang) is False


def test_tts_speakers_selection():
    speaker_hi = get_tts_speaker("hi-IN", is_v4=True)
    assert speaker_hi == "aditya_hi_conversational"

    speaker_en = get_tts_speaker("en-IN", is_v4=True)
    assert speaker_en == "shubh_en_narration"

    speaker_v3 = get_tts_speaker("hi-IN", is_v4=False)
    assert speaker_v3 == "shubh"


def test_set_sizes():
    assert len(VISION_LANGS) == 23
    assert len(LLM_STRONG_LANGS) == 11
    assert len(BULBUL_LANGS) == 11
