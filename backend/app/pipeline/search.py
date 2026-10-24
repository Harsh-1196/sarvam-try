from datetime import date, datetime, timedelta
import re
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
from app.adapters.sarvam_translate import SarvamTranslate
from app.adapters.sarvam_translit import SarvamTranslit
from app.adapters.tavily_client import TavilyClient, SearchResult


def normalize_url(url: str) -> str:
    """Normalizes URL: strips tracking parameters (utm_*, ref, fbclid), fragments, trailing slashes."""
    try:
        parsed = urlparse(url.strip())
        query_pairs = parse_qsl(parsed.query, keep_blank_values=False)
        # Filter out tracking query params
        tracking_prefixes = ("utm_", "fbclid", "gclid", "ref", "source", "mc_", "ga_")
        filtered_pairs = [
            (k, v) for k, v in query_pairs if not any(k.lower().startswith(p) for p in tracking_prefixes)
        ]
        clean_query = urlencode(filtered_pairs)
        clean_path = parsed.path.rstrip("/")
        normalized = urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            clean_path,
            parsed.params,
            clean_query,
            "",  # strip fragment
        ))
        return normalized
    except Exception:
        return url.strip()


def compute_shingles(text: str, k: int = 5) -> set[tuple[str, ...]]:
    """Generates k-word shingles from normalized words of text."""
    words = re.findall(r"\w+", text.lower())
    if len(words) < k:
        return {tuple(words)} if words else set()
    return {tuple(words[i : i + k]) for i in range(len(words) - k + 1)}


def jaccard_similarity(s1: set, s2: set) -> float:
    """Computes Jaccard similarity between two sets."""
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    intersection = len(s1.intersection(s2))
    union = len(s1.union(s2))
    return intersection / union if union > 0 else 0.0


def cluster_and_dedupe(
    results: list[SearchResult],
    threshold: float = 0.6,
) -> tuple[list[SearchResult], list[str], dict[str, str]]:
    """
    Normalizes URLs, then clusters near-duplicates using 5-word shingles on first 1500 chars.
    Pairs with Jaccard similarity >= threshold share a cluster_id.
    Keeps one primary entry per cluster (longest content), and generates human-readable notices.
    Returns: (kept_results, notices, url_to_cluster_map)
    """
    seen_urls: set[str] = set()
    unique_by_url: list[SearchResult] = []

    # 1. Dedupe by normalized URL
    for r in results:
        norm_url = normalize_url(r.url)
        if norm_url not in seen_urls:
            seen_urls.add(norm_url)
            r.url = norm_url
            unique_by_url.append(r)

    # 2. Compute shingles for each
    shingles_list = [compute_shingles(r.content[:1500], k=5) for r in unique_by_url]

    # 3. Disjoint set / clustering
    n = len(unique_by_url)
    parent = list(range(n))

    def find(i: int) -> int:
        if parent[i] == i:
            return i
        parent[i] = find(parent[i])
        return parent[i]

    def union(i: int, j: int):
        root_i = find(i)
        root_j = find(j)
        if root_i != root_j:
            parent[root_j] = root_i

    for i in range(n):
        for j in range(i + 1, n):
            sim = jaccard_similarity(shingles_list[i], shingles_list[j])
            if sim >= threshold:
                union(i, j)

    # Group by cluster root
    clusters: dict[int, list[int]] = {}
    for i in range(n):
        root = find(i)
        clusters.setdefault(root, []).append(i)

    kept: list[SearchResult] = []
    notices: list[str] = []
    url_to_cluster: dict[str, str] = {}
    cluster_counter = 1

    for root, indices in clusters.items():
        cluster_id = f"C{cluster_counter}"
        cluster_counter += 1

        # Select primary entry: prefer longest content
        sorted_indices = sorted(indices, key=lambda idx: len(unique_by_url[idx].content), reverse=True)
        primary = unique_by_url[sorted_indices[0]]
        kept.append(primary)
        url_to_cluster[primary.url] = cluster_id

        if len(indices) > 1:
            merged_count = len(indices) - 1
            for extra_idx in sorted_indices[1:]:
                url_to_cluster[unique_by_url[extra_idx].url] = cluster_id
            notices.append(f"{merged_count} syndicated/duplicate article copy merged under {cluster_id}")

    return kept, notices, url_to_cluster


class SearchPipeline:
    def __init__(
        self,
        tavily: TavilyClient | None = None,
        translate: SarvamTranslate | None = None,
        translit: SarvamTranslit | None = None,
    ):
        self.tavily = tavily or TavilyClient()
        self.translate = translate or SarvamTranslate()
        self.translit = translit or SarvamTranslit()

    async def build_queries(self, headline: str, detected_language: str | None = None) -> list[str]:
        """
        Builds search queries:
        q_orig: headline stripped of bylines
        q_en: translation to English if non-English
        """
        # Strip bylines like "- PTI", "| Reuters", "/ IANS"
        clean_headline = re.sub(r"[\s\-\|/]+(PTI|ANI|Reuters|IANS|AFP|Bloomberg|Express News Service).*$", "", headline, flags=re.IGNORECASE).strip()
        queries = [clean_headline]

        # If not English, translate to English
        is_english = detected_language == "en-IN" or bool(re.match(r"^[\x00-\x7F\s\d\W]+$", clean_headline))
        if not is_english:
            try:
                en_query = await self.translate.translate(clean_headline, source=detected_language or "auto", target="en-IN")
                if en_query and en_query.strip() and en_query.strip().lower() != clean_headline.lower():
                    queries.append(en_query.strip())
            except Exception:
                pass

        return queries

    async def search_and_rank(
        self,
        headline: str,
        newspaper_date: date | None = None,
        detected_language: str | None = None,
    ) -> tuple[list[SearchResult], list[str], dict[str, str]]:
        """
        Runs dual queries, applies date window (±3/-7 days), deduplicates,
        clusters near duplicates, and ranks top 5 results.
        """
        notices: list[str] = []
        queries = await self.build_queries(headline, detected_language)

        # Date window calculation
        start_date_str = None
        end_date_str = None
        if newspaper_date:
            start_d = newspaper_date - timedelta(days=3)
            end_d = min(newspaper_date + timedelta(days=7), date.today())
            start_date_str = start_d.isoformat()
            end_date_str = end_d.isoformat()
        else:
            notices.append("No publication date detected on newspaper; using unconstrained search window")

        # Execute searches concurrently for queries
        all_results: list[SearchResult] = []
        for q in queries:
            try:
                res = await self.tavily.search(
                    query=q,
                    start_date=start_date_str,
                    end_date=end_date_str,
                    max_results=5,
                )
                all_results.extend(res)
            except Exception as e:
                notices.append(f"Search query '{q[:30]}...' encountered notice: {str(e)}")

        # Filter valid HTTP(S) URLs
        valid_results = [r for r in all_results if r.url.startswith(("http://", "https://"))]

        # Dedupe and cluster
        clustered_results, cluster_notices, url_to_cluster = cluster_and_dedupe(valid_results, threshold=0.6)
        notices.extend(cluster_notices)

        # Rank by score and recency proximity
        def ranking_key(item: SearchResult) -> float:
            score = item.score
            # Recency boost if published_date parses
            if item.published_date and newspaper_date:
                try:
                    p_date = datetime.strptime(item.published_date[:10], "%Y-%m-%d").date()
                    delta = abs((p_date - newspaper_date).days)
                    proximity_bonus = max(0.0, (10.0 - delta) * 0.02)
                    score += proximity_bonus
                except Exception:
                    pass
            return score

        sorted_results = sorted(clustered_results, key=ranking_key, reverse=True)
        top_5 = sorted_results[:5]

        return top_5, notices, url_to_cluster
