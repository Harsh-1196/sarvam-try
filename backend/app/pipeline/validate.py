from datetime import date, datetime
import re
import unicodedata
from app.models import (
    Source,
    TimelineEvent,
    Perspective,
    Position,
    EvidenceItem,
)
from app.adapters.sarvam_llm import SarvamLLM


def normalize_for_quote_check(text: str) -> str:
    """
    Normalizes quote and source text:
    Unicode NFKC, collapse whitespace, strip zero-width characters,
    unify quotes and dashes, casefold.
    """
    if not text:
        return ""
    # Unicode NFKC
    norm = unicodedata.normalize("NFKC", text)
    # Strip zero-width characters (\u200b-\u200d, \ufeff)
    norm = re.sub(r"[\u200B-\u200D\uFEFF]", "", norm)
    # Unify quotes: curly double/single to ASCII
    norm = re.sub(r"[\u201C\u201D\u201E\u201F\u00AB\u00BB]", '"', norm)
    norm = re.sub(r"[\u2018\u2019\u201A\u201B\u2032]", "'", norm)
    # Unify dashes: en-dash, em-dash, minus to hyphen
    norm = re.sub(r"[\u2013\u2014\u2212\u2010\u2011\u2012]", "-", norm)
    # Collapse whitespace
    norm = re.sub(r"\s+", " ", norm).strip()
    # Casefold
    return norm.casefold()


def validate_timeline_date(
    event_date_str: str | None,
    precision: str,
    today: date,
) -> tuple[date | None, str]:
    """Validates date: must parse, must not be in future relative to today, and must not be before 1900."""
    if not event_date_str or event_date_str.lower() in ("null", "none", "unknown"):
        return None, "unknown"

    # Try parsing
    parsed_date = None
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            parsed_date = datetime.strptime(event_date_str[:10], fmt).date()
            break
        except ValueError:
            continue

    if not parsed_date:
        return None, "unknown"

    if parsed_date > today or parsed_date < date(1900, 1, 1):
        return None, "unknown"

    # Normalize precision
    if precision not in ("day", "month", "year", "unknown"):
        precision = "day"

    return parsed_date, precision


def check_unverified_claim(claim_text: str, quotes: list[str]) -> bool:
    """
    Checks if claim text contains numbers or years not present in quotes.
    If so, returns True (indicating unverified claim).
    """
    # Extract digits / numbers from claim text
    claim_nums = set(re.findall(r"\b\d+\b", claim_text))
    if not claim_nums:
        return False

    quotes_text = " ".join(quotes)
    quote_nums = set(re.findall(r"\b\d+\b", quotes_text))

    # If any specific number in the claim is missing from all surviving quotes
    unsupported_nums = claim_nums - quote_nums
    return len(unsupported_nums) > 0


async def validate_story_data(
    raw_timeline: list[dict],
    raw_perspectives: list[dict],
    sources: list[Source],
    today: date | None = None,
    evidence_review: bool = False,
    llm: SarvamLLM | None = None,
) -> tuple[list[TimelineEvent], list[Perspective], list[str]]:
    """
    Executes the full strict evidence validation pipeline in order:
    1. Source ID registry check
    2. Substring quote match (>= 20 chars, normalized NFKC)
    3. Dropping items with 0 evidence and adding notices
    4. Date checks (no future, >= 1900)
    5. Sorting timeline by event_date
    6. Perspectives validation & single-cluster downgrade
    7. Optional LLM evidence review
    """
    if today is None:
        today = date.today()

    source_map = {s.id: s for s in sources}
    norm_source_texts = {s.id: normalize_for_quote_check(s.model_text) for s in sources}
    notices: list[str] = []

    # 1 & 2 & 3. Validate Timeline Events
    valid_events: list[TimelineEvent] = []
    for idx, raw_e in enumerate(raw_timeline):
        title = raw_e.get("title", "").strip()
        desc = raw_e.get("description", "").strip()
        raw_evidence = raw_e.get("evidence", [])

        surviving_evidence: list[EvidenceItem] = []
        surviving_quotes: list[str] = []

        for ev in raw_evidence:
            sid = ev.get("source_id", "").strip()
            quote = ev.get("quote", "").strip()

            # Rule 1: Source ID check
            if sid not in source_map:
                notices.append(f"Event '{title[:30]}': Dropped evidence with unknown source {sid}")
                continue

            # Rule 2: Quote length & substring check
            norm_quote = normalize_for_quote_check(quote)
            if len(norm_quote) < 20:
                notices.append(f"Event '{title[:30]}': Dropped quote under 20 characters from {sid}")
                continue

            if norm_quote not in norm_source_texts[sid]:
                notices.append(f"Event '{title[:30]}': Quote not found verbatim in {sid}")
                continue

            surviving_evidence.append(EvidenceItem(source_id=sid, quote=quote))
            surviving_quotes.append(quote)

        # Rule 3: Event with zero evidence is dropped
        if not surviving_evidence:
            notices.append(f"Dropped timeline event '{title[:35]}': No verified evidence quotes found")
            continue

        # Rule 4: Date check
        e_date_str = raw_e.get("event_date")
        e_prec = raw_e.get("date_precision", "unknown")
        parsed_date, valid_prec = validate_timeline_date(e_date_str, e_prec, today)

        # Verification check
        verification = "verified"
        if check_unverified_claim(f"{title} {desc}", surviving_quotes):
            verification = "unverified"
            notices.append(f"Marked event '{title[:30]}' as unverified: claim contains figures not in quotes")

        # Assign image_url from supporting evidence sources if available
        ev_img = None
        for ev in surviving_evidence:
            src_obj = source_map.get(ev.source_id)
            if src_obj and src_obj.image_url:
                ev_img = src_obj.image_url
                break

        valid_events.append(
            TimelineEvent(
                id=f"E{len(valid_events) + 1}",
                event_date=parsed_date,
                date_precision=valid_prec,
                title=title,
                description=desc,
                evidence=surviving_evidence,
                verification=verification,
                image_url=ev_img,
            )
        )

    # 5. Sort timeline: dates ascending, unknown dates last, preserving model order among ties
    def timeline_sort_key(e: TimelineEvent):
        if e.event_date is None:
            return (1, date.max, int(e.id[1:]) if e.id[1:].isdigit() else 999)
        return (0, e.event_date, int(e.id[1:]) if e.id[1:].isdigit() else 999)

    valid_events.sort(key=timeline_sort_key)
    # Re-assign sequential IDs after sorting
    for idx, e in enumerate(valid_events):
        e.id = f"E{idx + 1}"

    # 6. Validate Perspectives
    valid_perspectives: list[Perspective] = []
    for raw_p in raw_perspectives:
        topic = raw_p.get("topic", "").strip()
        status = raw_p.get("status", "agreement")
        raw_positions = raw_p.get("positions", [])

        valid_positions: list[Position] = []
        for pos in raw_positions:
            label = pos.get("label", "").strip()
            summary = pos.get("summary", "").strip()
            raw_pos_ev = pos.get("evidence", [])

            surviving_pos_ev: list[EvidenceItem] = []
            for ev in raw_pos_ev:
                sid = ev.get("source_id", "").strip()
                quote = ev.get("quote", "").strip()
                if sid not in source_map:
                    continue
                norm_quote = normalize_for_quote_check(quote)
                if len(norm_quote) < 20 or norm_quote not in norm_source_texts[sid]:
                    continue
                surviving_pos_ev.append(EvidenceItem(source_id=sid, quote=quote))

            if surviving_pos_ev:
                valid_positions.append(
                    Position(label=label, summary=summary, evidence=surviving_pos_ev)
                )
            else:
                notices.append(f"Position '{label[:25]}' in topic '{topic[:25]}' dropped: no evidence")

        # Must have at least 1 position
        if not valid_positions:
            notices.append(f"Perspective topic '{topic[:30]}' dropped: no supported positions")
            continue

        # Check clusters among surviving evidence sources
        cited_sources = {
            ev.source_id
            for pos in valid_positions
            for ev in pos.evidence
        }
        distinct_clusters = {
            source_map[sid].cluster_id or sid
            for sid in cited_sources
            if sid in source_map
        }

        # Single cluster downgrade rule:
        # If factual_conflict or different_emphasis has only 1 distinct source cluster, downgrade
        if status in ("factual_conflict", "different_emphasis") and len(distinct_clusters) <= 1:
            status = "insufficient_evidence"
            notices.append(f"Perspective '{topic[:30]}' status downgraded to 'insufficient_evidence': only 1 source cluster cited")

        valid_perspectives.append(
            Perspective(
                topic=topic,
                status=status,
                positions=valid_positions,
            )
        )

    # 7. Optional LLM Evidence Review (if enabled)
    if evidence_review and llm is not None and valid_events:
        try:
            # Batch review claims
            items_to_review = []
            for e in valid_events[:8]:
                if e.evidence:
                    items_to_review.append({
                        "claim": f"{e.title}: {e.description}",
                        "quote": e.evidence[0].quote,
                    })

            if items_to_review:
                review_prompt = "For each item, judge whether the quote directly supports the claim. Return ONLY JSON {\"results\":[{\"index\":0,\"verdict\":\"supported|partial|unsupported\"}]}."
                user_content = "\n".join(
                    f"[{i}] Claim: {it['claim']}\nQuote: {it['quote']}"
                    for i, it in enumerate(items_to_review)
                )
                rev_res = await llm.chat_json(system=review_prompt, user=user_content)
                for verdict_item in rev_res.get("results", []):
                    v_idx = verdict_item.get("index")
                    verdict = verdict_item.get("verdict")
                    if v_idx is not None and v_idx < len(valid_events):
                        if verdict == "unsupported":
                            valid_events[v_idx].verification = "unverified"
                            notices.append(f"Evidence review marked '{valid_events[v_idx].title[:25]}' as unverified")
                        elif verdict == "partial":
                            valid_events[v_idx].verification = "unverified"
        except Exception:
            pass

    return valid_events, valid_perspectives, notices
