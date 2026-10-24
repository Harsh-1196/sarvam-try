from datetime import date
from app.pipeline.newspaper_date import detect_newspaper_date

REF_DATE = date(2026, 10, 23)


def test_newspaper_date_english_dmy():
    text = "The Times of India\nNew Delhi, 15 August 2026\nPrime Minister addresses the nation..."
    d = detect_newspaper_date(text, reference_date=REF_DATE)
    assert d == date(2026, 8, 15)


def test_newspaper_date_english_mdy():
    text = "Daily Chronicle | October 12, 2026 | Page 1\nTech summit begins today."
    d = detect_newspaper_date(text, reference_date=REF_DATE)
    assert d == date(2026, 10, 12)


def test_newspaper_date_hindi_textual():
    text = "दैनिक जागरण\nनई दिल्ली, 20 अक्टूबर 2026\nविधानसभा चुनाव की तारीखों का ऐलान..."
    d = detect_newspaper_date(text, reference_date=REF_DATE)
    assert d == date(2026, 10, 20)


def test_newspaper_date_hindi_devanagari_digits():
    text = "नवभारत टाइम्स - नई दिल्ली, २१ अक्टूबर २०२६, पृष्ठ ४\nव्यापार जगत में तेजी..."
    d = detect_newspaper_date(text, reference_date=REF_DATE)
    assert d == date(2026, 10, 21)


def test_newspaper_date_hindi_month_variation():
    text = "अमर उजाला\n१५ अगस्त २०२५\nस्वतंत्रता दिवस समारोह..."
    d = detect_newspaper_date(text, reference_date=REF_DATE)
    assert d == date(2025, 8, 15)


def test_newspaper_date_numeric_slash_dmy():
    text = "Hindustan Times | Vol 45 No 12 | 23/10/2026\nWeather outlook for the capital."
    d = detect_newspaper_date(text, reference_date=REF_DATE)
    assert d == date(2026, 10, 23)


def test_newspaper_date_numeric_dash_dmy():
    text = "The Indian Express\nDate: 05-09-2025\nTeachers day celebrated across institutions."
    d = detect_newspaper_date(text, reference_date=REF_DATE)
    assert d == date(2025, 9, 5)


def test_newspaper_date_iso_format():
    text = "National Bureau Report\nPublished: 2026-04-14\nNew economic guidelines released."
    d = detect_newspaper_date(text, reference_date=REF_DATE)
    assert d == date(2026, 4, 14)


def test_newspaper_date_in_footer():
    # Long text with date only in footer (last 600 chars)
    body = "Sample body text paragraph. " * 30
    footer = "\nPrinted and published by Times Group on 18 March 2026. All rights reserved."
    text = body + footer
    d = detect_newspaper_date(text, reference_date=REF_DATE)
    assert d == date(2026, 3, 18)


def test_newspaper_date_past_5_years_rejected():
    text = "Historic Gazette Archive\nDate: 15 August 2018\nEvents of the past."
    d = detect_newspaper_date(text, reference_date=REF_DATE)
    assert d is None  # More than 5 years prior to 2026


def test_newspaper_date_future_date_rejected():
    text = "Speculative Magazine\nEdition: 25 December 2028\nFuture predictions."
    d = detect_newspaper_date(text, reference_date=REF_DATE)
    assert d is None  # Future relative to 2026


def test_newspaper_date_no_date():
    text = "Just some text without any dates mentioned anywhere in the content."
    d = detect_newspaper_date(text, reference_date=REF_DATE)
    assert d is None


def test_newspaper_date_empty_string():
    assert detect_newspaper_date("") is None
