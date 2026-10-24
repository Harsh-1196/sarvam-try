"""
Language definitions, mapping, and capability checks for KhabarLens.
Based on verified Sarvam documentation (23-language set vs 11-language set).
"""

# 23-language set (Supported by Sarvam Vision, Saaras v4/v3, Sarvam Translate)
VISION_LANGS: set[str] = {
    "hi-IN", "en-IN", "bn-IN", "gu-IN", "kn-IN", "ml-IN", "mr-IN", "od-IN",
    "pa-IN", "ta-IN", "te-IN", "as-IN", "brx-IN", "doi-IN", "kok-IN", "ks-IN",
    "mai-IN", "mni-IN", "ne-IN", "sa-IN", "sat-IN", "sd-IN", "ur-IN",
}

SARVAM_TRANSLATE_LANGS: set[str] = VISION_LANGS
SAARAS_LANGS: set[str] = VISION_LANGS

# 11-language set (Strongly supported by Sarvam-105B and Bulbul TTS)
LLM_STRONG_LANGS: set[str] = {
    "hi-IN", "en-IN", "bn-IN", "gu-IN", "kn-IN", "ml-IN", "mr-IN", "od-IN",
    "pa-IN", "ta-IN", "te-IN",
}

BULBUL_LANGS: set[str] = LLM_STRONG_LANGS

# Default Bulbul speakers per language
# bulbul:v4-flash persona voice defaults
TTS_SPEAKERS_V4: dict[str, str] = {
    "hi-IN": "aditya_hi_conversational",
    "en-IN": "shubh_en_narration",
    "bn-IN": "arnab_bn_conversation",
    "gu-IN": "bhavik_gu_conversation",
    "kn-IN": "chaitra_kn_conversation",
    "ml-IN": "aditya_hi_conversational",
    "mr-IN": "ishita_mr_conversational",
    "od-IN": "aditya_hi_conversational",
    "pa-IN": "anand_pa_conversation",
    "ta-IN": "gokul_ta_narration",
    "te-IN": "kavitha_te_conversation",
    "as-IN": "kangkana_as_conversational",
}

# bulbul:v3 speakers fallback
TTS_SPEAKERS_V3: dict[str, str] = {
    "hi-IN": "shubh",
    "en-IN": "shubh",
    "bn-IN": "shubh",
    "gu-IN": "shubh",
    "kn-IN": "shubh",
    "ml-IN": "shubh",
    "mr-IN": "shubh",
    "od-IN": "shubh",
    "pa-IN": "shubh",
    "ta-IN": "gokul",
    "te-IN": "kavitha",
}


def normalize_lang_code(code: str | None) -> str:
    """Normalize language code to BCP-47 with -IN suffix if applicable."""
    if not code:
        return "hi-IN"
    code = code.strip().replace("_", "-")
    if "-" in code:
        parts = code.split("-")
        return f"{parts[0].lower()}-{parts[1].upper()}"
    # Short 2-letter codes mapping
    mapping = {
        "hi": "hi-IN", "en": "en-IN", "bn": "bn-IN", "gu": "gu-IN",
        "kn": "kn-IN", "ml": "ml-IN", "mr": "mr-IN", "od": "od-IN",
        "pa": "pa-IN", "ta": "ta-IN", "te": "te-IN", "as": "as-IN",
        "ur": "ur-IN", "ne": "ne-IN", "sa": "sa-IN", "kok": "kok-IN",
        "ks": "ks-IN", "sd": "sd-IN", "mai": "mai-IN", "doi": "doi-IN",
        "brx": "brx-IN", "sat": "sat-IN", "mni": "mni-IN",
    }
    return mapping.get(code.lower(), f"{code.lower()}-IN")


def should_pivot(lang_code: str) -> bool:
    """
    Pivot rule: If a source's language is not in LLM_STRONG_LANGS,
    create a translated copy in English (model_text).
    """
    norm = normalize_lang_code(lang_code)
    return norm not in LLM_STRONG_LANGS


def is_tts_supported(lang_code: str) -> bool:
    """TTS rule: Check if Bulbul supports speech synthesis in this language."""
    norm = normalize_lang_code(lang_code)
    return norm in BULBUL_LANGS


def get_tts_speaker(lang_code: str, is_v4: bool = True) -> str:
    """Return an appropriate default speaker for the target language."""
    norm = normalize_lang_code(lang_code)
    if is_v4 and norm in TTS_SPEAKERS_V4:
        return TTS_SPEAKERS_V4[norm]
    return TTS_SPEAKERS_V3.get(norm, "shubh")
