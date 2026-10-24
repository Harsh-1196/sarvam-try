from datetime import date, datetime
import re
from urllib.parse import urlparse
from app.models import Source, Block
from app.adapters.tavily_client import TavilyClient, SearchResult
from app.adapters.sarvam_lid import SarvamLID


def score_paragraph(paragraph: str, headline_tokens: set[str]) -> int:
    """Calculates keyword overlap between paragraph and headline tokens."""
    words = set(re.findall(r"\w+", paragraph.lower()))
    return len(words.intersection(headline_tokens))


def truncate_article_to_relevant_paragraphs(text: str, headline: str, max_chars: int = 6000) -> str:
    """
    Truncates text to at most max_chars, keeping the most relevant paragraphs
    scored by token overlap with the headline, while preserving their original order.
    """
    if len(text) <= max_chars:
        return text.strip()

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if len(p.strip()) > 30]
    if not paragraphs:
        return text[:max_chars].strip()

    headline_tokens = set(re.findall(r"\w+", headline.lower()))
    # Score paragraphs
    scored = [(idx, p, score_paragraph(p, headline_tokens)) for idx, p in enumerate(paragraphs)]
    # Sort by relevance score descending
    sorted_by_score = sorted(scored, key=lambda x: (x[2], len(x[1])), reverse=True)

    selected_indices = []
    total_len = 0
    for idx, p, _ in sorted_by_score:
        if total_len + len(p) + 2 <= max_chars:
            selected_indices.append(idx)
            total_len += len(p) + 2
        elif not selected_indices:
            # At least take the first paragraph
            selected_indices.append(idx)
            break

    # Restore original reading order
    selected_indices.sort()
    result = "\n\n".join(paragraphs[i] for i in selected_indices)
    return result.strip()


def extract_publisher_from_url(url: str | None) -> str | None:
    if not url:
        return None
    try:
        domain = urlparse(url).netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        # e.g., thehindu.com -> The Hindu
        name_part = domain.split(".")[0]
        return name_part.title()
    except Exception:
        return None


def build_s0_source(
    selected_headline: str,
    ocr_blocks: list[Block],
    detected_language: str,
    newspaper_date: str | None = None,
) -> Source:
    """
    Builds S0 from the selected headline plus the OCR blocks that follow it in reading order
    (up to 6,000 characters), until the next headline or end.
    """
    selected_norm = selected_headline.strip().lower()
    headline_idx = -1

    for idx, b in enumerate(ocr_blocks):
        if selected_norm in b.text.lower() or b.text.lower() in selected_norm:
            headline_idx = idx
            break

    content_blocks = []
    total_len = len(selected_headline)

    start_idx = headline_idx + 1 if headline_idx != -1 else 0
    for b in ocr_blocks[start_idx:]:
        # Stop if we hit another prominent heading after some text has been collected
        if b.block_type == "heading" and content_blocks and len(" ".join(content_blocks)) > 400:
            break
        text = b.text.strip()
        if total_len + len(text) + 2 > 6000:
            break
        content_blocks.append(text)
        total_len += len(text) + 2

    s0_text = f"{selected_headline}\n\n" + "\n\n".join(content_blocks)
    if len(content_blocks) == 0:
        # Fallback to joining all blocks if no subsequent blocks found
        s0_text = f"{selected_headline}\n\n" + "\n\n".join(b.text.strip() for b in ocr_blocks[:15])

    pub_date = None
    if newspaper_date:
        try:
            pub_date = datetime.strptime(newspaper_date, "%Y-%m-%d").date()
        except Exception:
            pass

    return Source(
        id="S0",
        kind="uploaded_newspaper",
        title=selected_headline,
        publisher="Your Uploaded Newspaper",
        url=None,
        published_at=pub_date,
        language=detected_language,
        original_text=s0_text.strip(),
        model_text=s0_text.strip(),
        machine_translated=False,
        cluster_id=None,
    )


async def build_source_registry(
    selected_headline: str,
    ocr_blocks: list[Block],
    detected_language: str,
    newspaper_date: str | None,
    search_results: list[SearchResult],
    url_to_cluster: dict[str, str],
    tavily: TavilyClient | None = None,
    lid: SarvamLID | None = None,
) -> tuple[list[Source], list[str]]:
    """
    Extracts article text, filters short articles (<300 chars), truncates to 6000 chars,
    identifies language, and assigns S0..S5.
    """
    if tavily is None:
        tavily = TavilyClient()
    if lid is None:
        lid = SarvamLID()

    notices: list[str] = []
    sources: list[Source] = []

    # 1. Build S0
    s0 = build_s0_source(selected_headline, ocr_blocks, detected_language, newspaper_date)
    sources.append(s0)

    if not search_results:
        return sources, notices

    # 2. Extract contents via Tavily Extract
    urls = [r.url for r in search_results]
    try:
        extracted_articles = await tavily.extract(urls)
        extract_map = {item.url: item.raw_content for item in extracted_articles}
    except Exception as e:
        notices.append(f"Tavily article extraction notice: {str(e)}")
        extract_map = {}

    # 3. Create S1..S5
    s_idx = 1
    for r in search_results:
        raw_content = extract_map.get(r.url) or r.content
        if not raw_content or len(raw_content.strip()) < 300:
            notices.append(f"Discarded article from {r.url}: insufficient extracted body text (< 300 characters)")
            continue

        truncated_text = truncate_article_to_relevant_paragraphs(raw_content, selected_headline, max_chars=6000)

        # Detect article language
        try:
            art_lang = await lid.identify(truncated_text[:500])
        except Exception:
            art_lang = "en-IN"

        pub_date = None
        if r.published_date:
            try:
                pub_date = datetime.strptime(r.published_date[:10], "%Y-%m-%d").date()
            except Exception:
                pass

        publisher_name = extract_publisher_from_url(r.url)

        source = Source(
            id=f"S{s_idx}",
            kind="web",
            title=r.title or f"Report on {selected_headline[:40]}",
            publisher=publisher_name,
            url=r.url,
            published_at=pub_date,
            language=art_lang,
            original_text=truncated_text,
            model_text=truncated_text,
            machine_translated=False,
            cluster_id=url_to_cluster.get(r.url),
            image_url=r.image_url,
        )
        sources.append(source)
        s_idx += 1
        if s_idx > 5:
            break

    return sources, notices
