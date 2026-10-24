from datetime import date
import pytest
from app.models import Source
from app.pipeline.validate import (
    normalize_for_quote_check,
    validate_timeline_date,
    validate_story_data,
    check_unverified_claim,
)

TODAY = date(2026, 10, 23)

MOCK_SOURCES = [
    Source(
        id="S0",
        kind="uploaded_newspaper",
        title="Local Election Results",
        language="en-IN",
        original_text="The Election Commission announced the final results on Tuesday after counting 450,000 votes.",
        model_text="The Election Commission announced the final results on Tuesday after counting 450,000 votes.",
        machine_translated=False,
    ),
    Source(
        id="S1",
        kind="web",
        title="Times of India Report",
        language="en-IN",
        original_text="Voter turnout reached an unprecedented 78.4 percent across all twenty districts in the province.",
        model_text="Voter turnout reached an unprecedented 78.4 percent across all twenty districts in the province.",
        machine_translated=False,
        cluster_id="C1",
    ),
    Source(
        id="S2",
        kind="web",
        title="Opposition Daily",
        language="en-IN",
        original_text="Party spokespersons filed formal objections regarding electronic voting machine discrepancies at midnight.",
        model_text="Party spokespersons filed formal objections regarding electronic voting machine discrepancies at midnight.",
        machine_translated=False,
        cluster_id="C2",
    ),
]


def test_quote_normalization_nfkc_and_whitespace():
    quote = "Voter   turnout   reached  an unprecedented 78.4 percent"
    norm = normalize_for_quote_check(quote)
    assert norm == "voter turnout reached an unprecedented 78.4 percent"


def test_quote_normalization_zero_width_and_quotes():
    quote = "\u200b“electronic voting machine discrepancies”"
    norm = normalize_for_quote_check(quote)
    assert norm == '"electronic voting machine discrepancies"'


def test_date_valid_day():
    d, prec = validate_timeline_date("2026-10-15", "day", TODAY)
    assert d == date(2026, 10, 15)
    assert prec == "day"


def test_date_future_becomes_unknown():
    d, prec = validate_timeline_date("2028-12-01", "day", TODAY)
    assert d is None
    assert prec == "unknown"


def test_date_before_1900_becomes_unknown():
    d, prec = validate_timeline_date("1885-01-01", "year", TODAY)
    assert d is None
    assert prec == "unknown"


def test_date_none_becomes_unknown():
    d, prec = validate_timeline_date(None, "unknown", TODAY)
    assert d is None
    assert prec == "unknown"


@pytest.mark.asyncio
async def test_quote_exact_match_passes():
    timeline = [
        {
            "event_date": "2026-10-20",
            "date_precision": "day",
            "title": "Vote Counting Completed",
            "description": "Commission counted votes",
            "evidence": [
                {
                    "source_id": "S0",
                    "quote": "The Election Commission announced the final results on Tuesday",
                }
            ],
        }
    ]
    events, _, notices = await validate_story_data(timeline, [], MOCK_SOURCES, today=TODAY)
    assert len(events) == 1
    assert events[0].evidence[0].source_id == "S0"


@pytest.mark.asyncio
async def test_quote_with_extra_whitespace_passes():
    timeline = [
        {
            "event_date": "2026-10-20",
            "date_precision": "day",
            "title": "High Turnout",
            "description": "Turnout numbers",
            "evidence": [
                {
                    "source_id": "S1",
                    "quote": "Voter   turnout reached   an unprecedented   78.4 percent",
                }
            ],
        }
    ]
    events, _, _ = await validate_story_data(timeline, [], MOCK_SOURCES, today=TODAY)
    assert len(events) == 1


@pytest.mark.asyncio
async def test_quote_not_in_text_removed():
    timeline = [
        {
            "event_date": "2026-10-20",
            "date_precision": "day",
            "title": "False Claim",
            "description": "Desc",
            "evidence": [
                {
                    "source_id": "S1",
                    "quote": "This sentence never appears in any article at all anywhere.",
                }
            ],
        }
    ]
    events, _, notices = await validate_story_data(timeline, [], MOCK_SOURCES, today=TODAY)
    assert len(events) == 0
    assert any("Dropped timeline event" in n for n in notices)


@pytest.mark.asyncio
async def test_quote_under_20_chars_removed():
    timeline = [
        {
            "event_date": "2026-10-20",
            "date_precision": "day",
            "title": "Short Quote",
            "description": "Desc",
            "evidence": [
                {
                    "source_id": "S1",
                    "quote": "Voter turnout",  # Only 13 chars
                }
            ],
        }
    ]
    events, _, notices = await validate_story_data(timeline, [], MOCK_SOURCES, today=TODAY)
    assert len(events) == 0


@pytest.mark.asyncio
async def test_unknown_source_id_removed():
    timeline = [
        {
            "event_date": "2026-10-20",
            "date_precision": "day",
            "title": "Unknown Source",
            "description": "Desc",
            "evidence": [
                {
                    "source_id": "S99",
                    "quote": "Some statement that has an unregistered source id",
                }
            ],
        }
    ]
    events, _, notices = await validate_story_data(timeline, [], MOCK_SOURCES, today=TODAY)
    assert len(events) == 0
    assert any("unknown source S99" in n for n in notices)


@pytest.mark.asyncio
async def test_timeline_sorting():
    timeline = [
        {
            "event_date": "2026-10-22",
            "date_precision": "day",
            "title": "Later Event",
            "description": "Desc",
            "evidence": [{"source_id": "S1", "quote": "Voter turnout reached an unprecedented 78.4 percent"}],
        },
        {
            "event_date": "2026-10-18",
            "date_precision": "day",
            "title": "Earlier Event",
            "description": "Desc",
            "evidence": [{"source_id": "S0", "quote": "The Election Commission announced the final results on Tuesday"}],
        },
        {
            "event_date": None,
            "date_precision": "unknown",
            "title": "Undated Event",
            "description": "Desc",
            "evidence": [{"source_id": "S2", "quote": "Party spokespersons filed formal objections regarding electronic voting"}],
        },
    ]
    events, _, _ = await validate_story_data(timeline, [], MOCK_SOURCES, today=TODAY)
    assert len(events) == 3
    # 2026-10-18 comes first (E1), then 2026-10-22 (E2), then unknown date last (E3)
    assert events[0].id == "E1" and events[0].event_date == date(2026, 10, 18)
    assert events[1].id == "E2" and events[1].event_date == date(2026, 10, 22)
    assert events[2].id == "E3" and events[2].event_date is None


@pytest.mark.asyncio
async def test_perspective_single_cluster_downgrade():
    perspectives = [
        {
            "topic": "Voter Irregularities",
            "status": "factual_conflict",
            "positions": [
                {
                    "label": "Official View",
                    "summary": "Turnout confirmed",
                    "evidence": [{"source_id": "S1", "quote": "Voter turnout reached an unprecedented 78.4 percent across all twenty"}],
                }
            ],
        }
    ]
    _, valid_p, notices = await validate_story_data([], perspectives, MOCK_SOURCES, today=TODAY)
    assert len(valid_p) == 1
    # Only S1 (cluster C1) cited, so status must be downgraded to insufficient_evidence
    assert valid_p[0].status == "insufficient_evidence"
    assert any("downgraded to 'insufficient_evidence'" in n for n in notices)


@pytest.mark.asyncio
async def test_perspective_two_clusters_keeps_conflict():
    perspectives = [
        {
            "topic": "Voting Fairness",
            "status": "factual_conflict",
            "positions": [
                {
                    "label": "Official View",
                    "summary": "High turnout",
                    "evidence": [{"source_id": "S1", "quote": "Voter turnout reached an unprecedented 78.4 percent across all twenty"}],
                },
                {
                    "label": "Opposition View",
                    "summary": "Objections raised",
                    "evidence": [{"source_id": "S2", "quote": "Party spokespersons filed formal objections regarding electronic voting machine"}],
                },
            ],
        }
    ]
    _, valid_p, _ = await validate_story_data([], perspectives, MOCK_SOURCES, today=TODAY)
    assert len(valid_p) == 1
    # S1 (C1) and S2 (C2) are distinct clusters -> keeps factual_conflict
    assert valid_p[0].status == "factual_conflict"
    assert len(valid_p[0].positions) == 2


@pytest.mark.asyncio
async def test_unverified_claim_detection():
    # Claim mentions 999 which is not in quotes
    claim = "The election result involved 999 voting machines in the region."
    quotes = ["The Election Commission announced the final results on Tuesday after counting 450,000 votes."]
    is_unverified = check_unverified_claim(claim, quotes)
    assert is_unverified is True
