from contextlib import asynccontextmanager
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.errors import (
    AppError,
    app_error_handler,
    http_exception_handler,
    generic_exception_handler,
)
from app.session_store import session_store
from app.routes.health import router as health_router

# In-memory IP rate limiter (20 req / min window)
_ip_requests: dict[str, list[float]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    session_store.ttl_minutes = settings.SESSION_TTL_MINUTES
    session_store.start_cleaner()
    yield
    session_store.stop_cleaner()


app = FastAPI(
    title="KhabarLens API",
    version="0.1.0",
    description="Multilingual Evidence-Linked Newspaper Intelligence",
    lifespan=lifespan,
)

# Exception handlers
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# CORS Middleware
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
if not origins:
    origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    # Exempt health checks from rate limiting
    if request.url.path == "/api/health":
        return await call_next(request)

    now = time.time()
    req_history = _ip_requests.setdefault(client_ip, [])
    # Keep requests from the last 60 seconds
    _ip_requests[client_ip] = [t for t in req_history if now - t < 60.0]

    # Limit to 30 requests per minute per IP for smooth UI polling
    if len(_ip_requests[client_ip]) >= 60:
        return JSONResponse(
            status_code=429,
            content={
                "error": {
                    "code": "RATE_LIMITED",
                    "message": "Too many requests. Please slow down.",
                    "retryable": True,
                }
            },
        )

    _ip_requests[client_ip].append(now)
    response = await call_next(request)
    return response


from app.routes.newspaper import router as newspaper_router
from app.routes.story import router as story_router
from app.routes.ask import router as ask_router

# Include Routers
app.include_router(health_router)
app.include_router(newspaper_router)
app.include_router(story_router)
app.include_router(ask_router)
