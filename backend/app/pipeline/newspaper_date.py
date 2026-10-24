from datetime import date, datetime, timedelta
import re

# Devanagari numerals to ASCII digits mapping
DEVANAGARI_DIGITS = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
}

def normalize_digits(text: str) -> str:
    """Replaces Devanagari numerals with ASCII digits."""
    return "".join(DEVANAGARI_DIGITS.get(ch, ch) for ch in text)

# Month mapping
MONTH_NAMES = {
    # English
    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7,
    "august": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12,
    # Hindi
    "जनवरी": 1, "फ़रवरी": 2, "फरवरी": 2,
    "मार्च": 3, "अप्रैल": 4, "अप्रेल": 4,
    "मई": 5, "जून": 6,
    "जुलाई": 7, "अगस्त": 8,
    "सितंबर": 9, "सितम्बर": 9,
    "अक्टूबर": 10, "अक्तूबर": 10,
    "नवंबर": 11, "नवम्बर": 11,
    "दिसंबर": 12, "दिसम्बर": 12,
}


def parse_date_candidate(year: int, month: int, day: int, reference_date: date | None = None) -> date | None:
    """Validates year, month, day and checks if within last 5 years relative to reference_date (or today)."""
    ref = reference_date or date.today()
    try:
        cand = date(year, month, day)
    except ValueError:
        return None

    # Within last 5 years up to today (+ 1 day for timezone buffer)
    five_years_ago = ref.replace(year=ref.year - 5)
    tomorrow = ref + timedelta(days=1)
    if five_years_ago <= cand <= tomorrow:
        return cand
    return None


def detect_newspaper_date(ocr_text: str, reference_date: date | None = None) -> date | None:
    """
    Detects a newspaper publication date from the first and last 600 characters of OCR text.
    Handles numeric forms (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD), English month names,
    and Hindi month names with Devanagari numerals.
    """
    if not ocr_text:
        return None

    ref = reference_date or date.today()

    # Search in head and tail of OCR text
    head = ocr_text[:600]
    tail = ocr_text[-600:] if len(ocr_text) > 600 else ""
    snippet = head + "\n" + tail
    normalized = normalize_digits(snippet)

    # 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
    iso_matches = re.finditer(r"\b(20[1-3]\d)[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b", normalized)
    for m in iso_matches:
        y, m_val, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        d_obj = parse_date_candidate(y, m_val, d, ref)
        if d_obj:
            return d_obj

    # 2. DD/MM/YYYY or DD-MM-YYYY
    dmy_matches = re.finditer(r"\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20[1-3]\d)\b", normalized)
    for m in dmy_matches:
        d, m_val, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        d_obj = parse_date_candidate(y, m_val, d, ref)
        if d_obj:
            return d_obj

    # 3. Textual months in English or Hindi
    # e.g., "15 August 2026", "23 अक्टूबर 2026", "March 12, 2025"
    all_months_pattern = "|".join(re.escape(k) for k in MONTH_NAMES.keys())

    # Pattern A: Day Month Year (e.g. 24 October 2026, 24 अक्टूबर 2026)
    p_dmy = re.compile(
        rf"\b(0?[1-9]|[12]\d|3[01])\s*,?\s*({all_months_pattern})\s*,?\s*(20[1-3]\d)\b",
        re.IGNORECASE,
    )
    for m in p_dmy.finditer(normalized):
        d = int(m.group(1))
        m_name = m.group(2).lower()
        y = int(m.group(3))
        m_val = MONTH_NAMES.get(m_name)
        if m_val:
            d_obj = parse_date_candidate(y, m_val, d, ref)
            if d_obj:
                return d_obj

    # Pattern B: Month Day, Year (e.g. October 24, 2026)
    p_mdy = re.compile(
        rf"\b({all_months_pattern})\s+(0?[1-9]|[12]\d|3[01])\s*,?\s*(20[1-3]\d)\b",
        re.IGNORECASE,
    )
    for m in p_mdy.finditer(normalized):
        m_name = m.group(1).lower()
        d = int(m.group(2))
        y = int(m.group(3))
        m_val = MONTH_NAMES.get(m_name)
        if m_val:
            d_obj = parse_date_candidate(y, m_val, d, ref)
            if d_obj:
                return d_obj

    return None
