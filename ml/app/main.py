"""
app/main.py
───────────
ecoVolt-finder ML service — FastAPI application factory.

Mounts all domain routers and provides:
  GET /health   — liveness probe
  GET /docs     — Swagger UI (auto-generated)
  GET /redoc    — ReDoc (auto-generated)

CORS is configured for the Node backend (Member 2) via ALLOWED_ORIGINS env var.
Structured logging is initialised at startup.

GRID_MODE (live | mock | hybrid) is read from env at startup and threaded through
config into each domain module resolver — see docs/notes/M3-C1.md §4.
"""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.logging_cfg import configure_logging, get_logger
from app.models import HealthResponse
from routers import classify, grid, recommend, routing, smartcharge, windows

# ── Logging must be set up before anything else ───────────────────────────────
configure_logging()
logger = get_logger(__name__)
settings = get_settings()


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info(
        "ecoVolt-finder ML service starting",
        version=settings.version,
        grid_mode=settings.grid_mode,
        host=settings.host,
        port=settings.port,
    )
    yield
    logger.info("ecoVolt-finder ML service shutting down")


# ── App factory ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="ecoVolt-finder — ML / Data / Maps FastAPI Service",
    description=(
        "Python FastAPI microservice for grid data ingestion, renewable classification, "
        "forecasting, routing, travel-cost modelling, and recommendation ranking. "
        "Consumed by the Node backend (Member 2) over HTTP. "
        "API keys never ship to the app.\n\n"
        "**GRID_MODE** env var: `live` | `mock` | `hybrid` (controls data source behaviour).\n"
        "All times stored/returned in UTC. Conversion to IST happens at the display layer."
    ),
    version=settings.version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── Request-level structured logging middleware ────────────────────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next) -> Response:  # type: ignore[return]
    start = time.perf_counter()
    response: Response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        "http request",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
        grid_mode=settings.grid_mode,
    )
    return response


# ── Health endpoint ────────────────────────────────────────────────────────────

@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["health"],
    summary="Service health check",
)
async def health() -> HealthResponse:
    """
    Liveness probe — always returns 200 if the service is up.
    `gridMode` reflects the current GRID_MODE env var.
    """
    return HealthResponse(
        status="ok",
        gridMode=settings.grid_mode,
        version=settings.version,
    )


# ── Domain routers ────────────────────────────────────────────────────────────

app.include_router(grid.router)
app.include_router(classify.router)
app.include_router(windows.router)
app.include_router(routing.router)
app.include_router(recommend.router)
app.include_router(smartcharge.router)
