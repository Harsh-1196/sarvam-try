import pytest
from app.adapters.tavily_client import SearchResult
from app.pipeline.search import (
    normalize_url,
    compute_shingles,
    jaccard_similarity,
    cluster_and_dedupe,
)


def test_url_normalization():
    raw_url = "https://www.thehindu.com/news/national/article.html?utm_source=twitter&utm_medium=social&ref=feed#comments/"
    clean = normalize_url(raw_url)
    assert "utm_source" not in clean
    assert "utm_medium" not in clean
    assert "ref=" not in clean
    assert "#comments" not in clean
    assert clean == "https://www.thehindu.com/news/national/article.html"


def test_shingle_computation():
    text = "Prime Minister addressed the international conference on green hydrogen energy in New Delhi today."
    shingles = compute_shingles(text, k=5)
    assert len(shingles) > 0
    # Every shingle has length 5
    first = next(iter(shingles))
    assert len(first) == 5


def test_jaccard_similarity_threshold():
    text1 = "India launches its first indigenous space telescope from Sriharikota space center."
    text2 = "India launches its first indigenous space telescope from Sriharikota space center today with success."
    s1 = compute_shingles(text1, k=4)
    s2 = compute_shingles(text2, k=4)
    sim = jaccard_similarity(s1, s2)
    assert sim >= 0.6


def test_clustering_and_dedupe_syndicated_copies():
    r1 = SearchResult(
        title="NDTV Report",
        url="https://ndtv.com/india-news/story-1?utm_campaign=main",
        content="The supreme court of India delivered a landmark verdict on privacy rights on Monday afternoon.",
        score=0.9,
    )
    # Syndicated wire copy with slight variation
    r2 = SearchResult(
        title="Hindustan Times Report",
        url="https://hindustantimes.com/india-news/story-1",
        content="The supreme court of India delivered a landmark verdict on privacy rights on Monday afternoon with unanimous bench.",
        score=0.85,
    )
    # Distinct article
    r3 = SearchResult(
        title="Cricket Update",
        url="https://espn.com/cricket/match-1",
        content="India defeated Australia in the final test match with a dominant batting performance in Melbourne.",
        score=0.7,
    )

    kept, notices, cluster_map = cluster_and_dedupe([r1, r2, r3], threshold=0.6)
    # r1 and r2 must be clustered together, leaving 2 distinct sources
    assert len(kept) == 2
    assert any("syndicated/duplicate" in n for n in notices)
    assert cluster_map[r1.url] == cluster_map[r2.url]


def test_clustering_empty_list():
    kept, notices, cluster_map = cluster_and_dedupe([])
    assert kept == []
    assert notices == []
    assert cluster_map == {}
