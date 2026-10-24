from pydantic import BaseModel, Field
from app.config import settings
from app.errors import AppError
from app.adapters.base import request_with_retry


class SearchResult(BaseModel):
    title: str
    url: str
    content: str
    score: float = 0.0
    published_date: str | None = None
    image_url: str | None = None


class ExtractResult(BaseModel):
    url: str
    raw_content: str


class TavilyClient:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.TAVILY_API_KEY
        self.base_url = "https://api.tavily.com"

    async def search(
        self,
        query: str,
        start_date: str | None = None,
        end_date: str | None = None,
        max_results: int = 5,
    ) -> list[SearchResult]:
        """
        Searches web articles via Tavily News API with optional date window.
        Gracefully falls back to unrestricted search if date filters fail.
        """
        if not query or not query.strip():
            return []

        url = f"{self.base_url}/search"
        headers = {"Content-Type": "application/json"}
        payload = {
            "api_key": self.api_key,
            "query": query.strip(),
            "topic": "news",
            "max_results": max_results,
            "include_images": True,
        }
        if start_date:
            payload["start_date"] = start_date
        if end_date:
            payload["end_date"] = end_date

        try:
            res = await request_with_retry(
                method="POST",
                url=url,
                headers=headers,
                json=payload,
                error_code="SEARCH_FAILED",
                timeout=25.0,
            )
        except AppError as e:
            # Fallback retry without date constraints if date filter failed
            if start_date or end_date:
                payload.pop("start_date", None)
                payload.pop("end_date", None)
                res = await request_with_retry(
                    method="POST",
                    url=url,
                    headers=headers,
                    json=payload,
                    error_code="SEARCH_FAILED",
                    timeout=25.0,
                )
            else:
                raise e

        data = res.json()
        top_images = data.get("images", [])
        results: list[SearchResult] = []
        for idx, item in enumerate(data.get("results", [])):
            img = None
            item_imgs = item.get("images", [])
            if isinstance(item_imgs, list) and item_imgs:
                img = item_imgs[0]
            elif isinstance(top_images, list) and idx < len(top_images):
                img = top_images[idx]
            elif item.get("image_url"):
                img = item.get("image_url")

            results.append(
                SearchResult(
                    title=item.get("title", ""),
                    url=item.get("url", ""),
                    content=item.get("content", ""),
                    score=float(item.get("score", 0.0)),
                    published_date=item.get("published_date"),
                    image_url=img,
                )
            )
        return results

    async def extract(self, urls: list[str]) -> list[ExtractResult]:
        """Extracts full article contents from target URLs via Tavily Extract."""
        if not urls:
            return []

        url = f"{self.base_url}/extract"
        headers = {"Content-Type": "application/json"}
        payload = {
            "api_key": self.api_key,
            "urls": urls,
        }

        res = await request_with_retry(
            method="POST",
            url=url,
            headers=headers,
            json=payload,
            error_code="SEARCH_FAILED",
            timeout=30.0,
        )

        data = res.json()
        results: list[ExtractResult] = []
        for item in data.get("results", []):
            results.append(
                ExtractResult(
                    url=item.get("url", ""),
                    raw_content=item.get("raw_content", ""),
                )
            )
        return results
