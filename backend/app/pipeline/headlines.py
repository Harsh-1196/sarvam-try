from pathlib import Path
import re
import unicodedata
from app.models import Block, HeadlineCandidate
from app.adapters.sarvam_llm import SarvamLLM

PROMPT_FILE = Path(__file__).resolve().parent.parent / "prompts" / "headlines_system.txt"


def normalize_text_for_match(text: str) -> str:
    """Normalizes text for substring checking (NFKC, lowercase, collapse whitespace)."""
    norm = unicodedata.normalize("NFKC", text)
    norm = re.sub(r"\s+", " ", norm).strip().lower()
    return norm


def extract_rule_based_candidates(blocks: list[Block]) -> list[HeadlineCandidate]:
    """
    Rule-based headline candidate extraction:
    Prefers blocks with block_type == 'heading', or blocks with 3 to 25 words,
    no terminal full stop/danda, appearing before a longer paragraph.
    """
    candidates: list[HeadlineCandidate] = []
    seen_texts = set()

    # Pass 1: explicit headings from OCR
    for b in blocks:
        clean_text = re.sub(r"<[^>]+>", " ", b.text)
        text = re.sub(r"\s+", " ", clean_text).strip()
        word_count = len(text.split())
        if b.block_type == "heading" and 3 <= word_count <= 35:
            if text not in seen_texts:
                seen_texts.add(text)
                candidates.append(
                    HeadlineCandidate(
                        id=f"h{len(candidates) + 1}",
                        text=text,
                        block_ids=[b.id],
                        confidence=0.9,
                    )
                )

    # Pass 2: heuristic candidates if headings are sparse
    for i, b in enumerate(blocks):
        if len(candidates) >= 8:
            break
        text = b.text.strip()
        if text in seen_texts:
            continue
        words = text.split()
        word_count = len(words)
        # 3 to 25 words, no terminal period or danda
        if 3 <= word_count <= 25 and not text.endswith((".", "।", "!", "?")):
            # Check if followed by a longer block
            has_longer_subsequent = any(
                len(sub.text.split()) > word_count + 5 for sub in blocks[i + 1 : i + 4]
            )
            if has_longer_subsequent:
                seen_texts.add(text)
                candidates.append(
                    HeadlineCandidate(
                        id=f"h{len(candidates) + 1}",
                        text=text,
                        block_ids=[b.id],
                        confidence=0.75,
                    )
                )

    # Pass 3: Fallback to first non-empty block if still empty
    if not candidates and blocks:
        for b in blocks[:5]:
            text = b.text.strip()
            if 3 <= len(text.split()) <= 40:
                candidates.append(
                    HeadlineCandidate(
                        id=f"h{len(candidates) + 1}",
                        text=text,
                        block_ids=[b.id],
                        confidence=0.6,
                    )
                )
                break

    return candidates[:8]


async def extract_headline_candidates(
    blocks: list[Block],
    llm: SarvamLLM | None = None,
) -> list[HeadlineCandidate]:
    """
    Extracts candidate article headlines using rule-based filtering + Sarvam-105B selection.
    Validates that each candidate text is a substring of the joined block texts.
    Falls back to rule-based candidates if LLM call fails.
    """
    rule_candidates = extract_rule_based_candidates(blocks)
    if not blocks:
        return []

    if llm is None:
        llm = SarvamLLM()

    # Load system prompt
    try:
        with open(PROMPT_FILE, "r", encoding="utf-8") as f:
            system_prompt = f.read()
    except Exception:
        system_prompt = (
            "From the numbered text blocks, choose 3 to 8 that are most likely to be newspaper article headlines "
            '(not ads, not datelines, not body paragraphs). Return ONLY JSON {"candidates":[{"text","block_ids","confidence"}]}. '
            "`text` must be copied exactly from the blocks; do not rewrite or translate."
        )

    # Build block representation for the model (first 30 blocks are plenty for front-page headlines)
    blocks_subset = blocks[:30]
    block_map = {b.id: b.text for b in blocks_subset}
    user_content = "\n".join(
        f"[{b.id}] ({b.block_type or 'text'}): {b.text}" for b in blocks_subset
    )

    try:
        res = await llm.chat_json(system=system_prompt, user=user_content, temperature=0.1)
        raw_candidates = res.get("candidates", [])
        verified: list[HeadlineCandidate] = []

        for item in raw_candidates:
            c_text = item.get("text", "").strip()
            c_block_ids = item.get("block_ids", [])
            conf = float(item.get("confidence", 0.8))

            if not c_text or not c_block_ids:
                continue

            # Verify that each block_id exists in our subset
            joined_block_text = " ".join(block_map.get(bid, "") for bid in c_block_ids)
            norm_c = normalize_text_for_match(c_text)
            norm_joined = normalize_text_for_match(joined_block_text)

            # Substring check
            if norm_c in norm_joined and len(c_text.split()) >= 2:
                verified.append(
                    HeadlineCandidate(
                        id=f"h{len(verified) + 1}",
                        text=c_text,
                        block_ids=c_block_ids,
                        confidence=min(1.0, max(0.1, conf)),
                    )
                )

        if 3 <= len(verified) <= 8:
            return verified
        elif len(verified) > 0:
            # Supplement with rule-based candidates up to at least 3
            seen_texts = {normalize_text_for_match(v.text) for v in verified}
            for rc in rule_candidates:
                if normalize_text_for_match(rc.text) not in seen_texts:
                    seen_texts.add(normalize_text_for_match(rc.text))
                    rc.id = f"h{len(verified) + 1}"
                    verified.append(rc)
                if len(verified) >= 8:
                    break
            return verified
    except Exception:
        pass

    # Fallback to rule-based candidates
    return rule_candidates
