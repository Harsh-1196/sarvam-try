import asyncio
import httpx
from app.errors import AppError


async def request_with_retry(
    method: str,
    url: str,
    headers: dict,
    error_code: str,
    timeout: float = 30.0,
    max_retries: int = 2,
    **kwargs,
) -> httpx.Response:
    """
    Executes an HTTP request with bounded exponential backoff on 429/5xx and timeouts.
    Never logs keys or full authorization headers.
    """
    attempt = 0
    delay = 1.0

    while True:
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.request(method, url, headers=headers, **kwargs)

            # Success or client-side errors that shouldn't be retried
            if res.status_code == 429:
                if attempt >= max_retries:
                    raise AppError(
                        "RATE_LIMITED",
                        "Upstream API rate limit reached. Please wait and retry.",
                        status_code=429,
                        retryable=True,
                    )
            elif res.status_code >= 500:
                if attempt >= max_retries:
                    raise AppError(
                        error_code,
                        f"Upstream server error (status {res.status_code})",
                        status_code=502,
                        retryable=True,
                    )
            elif res.status_code >= 400:
                # 4xx client errors (e.g. 400, 401, 403, 422) are non-retryable
                try:
                    err_json = res.json()
                    msg = err_json.get("error", {}).get("message") or err_json.get("detail") or res.text
                except Exception:
                    msg = res.text
                raise AppError(
                    error_code,
                    f"Upstream API request failed: {msg}",
                    status_code=res.status_code,
                    retryable=False,
                )
            else:
                return res

        except (httpx.TimeoutException, httpx.NetworkError) as e:
            if attempt >= max_retries:
                raise AppError(
                    f"{error_code}_TIMEOUT" if isinstance(e, httpx.TimeoutException) else error_code,
                    f"Upstream connection failed: {str(e)}",
                    status_code=504,
                    retryable=True,
                )

        attempt += 1
        await asyncio.sleep(delay)
        delay *= 2.0
