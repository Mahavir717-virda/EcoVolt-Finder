"""
app/ingestion/resolver.py
──────────────────────────
GRID_MODE resolver — the single call-site for all grid data.

Resolution order (see docs/notes/M3-C2.md §5):

  GRID_MODE=live:
    1. ElectricityMapsClient.fetch()
    2. IngestionError → raise HTTPException(503)

  GRID_MODE=mock:
    1. MockGenerator.fetch()  ← always succeeds

  GRID_MODE=hybrid (default, demo-safe):
    1. ElectricityMapsClient.fetch()           → quality=live, store in cache
    2. IngestionError → cache.get(zone_id)     → quality=cached (or stale)
    3. cache miss / evicted                    → MockGenerator.fetch() → quality=mock

Cache: in-process dict, TTL from settings.grid_cache_ttl_sec (default 300 s).
  cached : age ≤ TTL × 2
  stale  : age > TTL × 2 (still returned — never crash)

Concurrency: cache reads/writes happen under asyncio without cross-request locks.
For a single-worker demo this is safe; a real multi-worker deploy would use Redis.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import TYPE_CHECKING

import structlog
from fastapi import HTTPException

from app.ingestion.base import IngestionError
from app.ingestion.electricity_maps import ElectricityMapsClient
from app.ingestion.india_atlas import IndiaAtlasClient
from app.ingestion.mock_generator import MockGenerator
from app.models import GridSnapshot

if TYPE_CHECKING:
    from app.config import Settings

logger = structlog.get_logger(__name__)

# ── In-process snapshot cache ─────────────────────────────────────────────────
# zone_id → (snapshot, fetched_at_utc)
_cache: dict[str, tuple[GridSnapshot, datetime]] = {}


def _cache_get(zone_id: str, ttl_sec: int) -> GridSnapshot | None:
    """Return cached snapshot if within 2×TTL, or None. Adjusts quality tag."""
    if zone_id not in _cache:
        return None
    snapshot, fetched_at = _cache[zone_id]
    age_sec = (datetime.now(timezone.utc) - fetched_at).total_seconds()
    if age_sec <= ttl_sec * 2:
        quality = "cached" if age_sec <= ttl_sec else "stale"
        return snapshot.model_copy(
            update={"quality": quality, "asOfAgeSec": int(age_sec)}
        )
    # Beyond 2×TTL — evict and let resolver fall through to mock
    del _cache[zone_id]
    return None


def _cache_put(zone_id: str, snapshot: GridSnapshot) -> None:
    _cache[zone_id] = (snapshot, datetime.now(timezone.utc))


def clear_cache() -> None:
    """Clear the in-process cache. Used in tests."""
    _cache.clear()


# ── Public interface ──────────────────────────────────────────────────────────

async def resolve(zone_id: str, settings: "Settings") -> GridSnapshot:
    """
    Resolve a GridSnapshot for zone_id, obeying GRID_MODE.
    Never raises — always returns a valid snapshot (in hybrid/mock mode).
    May raise HTTPException(503) in live mode only.
    """
    mode = settings.grid_mode

    if mode == "mock":
        return await _from_mock(zone_id, settings)

    if mode == "live":
        return await _from_live_only(zone_id, settings)

    # hybrid: live → cache → mock
    return await _from_hybrid(zone_id, settings)


# ── Resolution strategies ─────────────────────────────────────────────────────

async def _from_mock(zone_id: str, settings: "Settings") -> GridSnapshot:
    mock = MockGenerator(seed=settings.mock_seed)
    snapshot = await mock.fetch(zone_id)
    logger.debug("grid resolved via mock", zone_id=zone_id)
    return snapshot


async def _from_live_only(zone_id: str, settings: "Settings") -> GridSnapshot:
    if not settings.electricity_maps_token:
        logger.error("live mode but ELECTRICITY_MAPS_TOKEN not set", zone_id=zone_id)
        raise HTTPException(
            status_code=503,
            detail="ELECTRICITY_MAPS_TOKEN is not configured; cannot serve live data.",
        )
    client = ElectricityMapsClient(settings.electricity_maps_token)
    try:
        snapshot = await client.fetch(zone_id)
        _cache_put(zone_id, snapshot)
        logger.info("grid resolved via live API", zone_id=zone_id, quality=snapshot.quality)
        return snapshot
    except IngestionError as exc:
        logger.error("live API failed; no fallback in live mode", zone_id=zone_id, error=str(exc))
        raise HTTPException(
            status_code=503,
            detail=f"Grid API unavailable: {exc}",
        ) from exc


async def _from_hybrid(zone_id: str, settings: "Settings") -> GridSnapshot:
    # Step 1: Try live API
    if settings.electricity_maps_token:
        client = ElectricityMapsClient(settings.electricity_maps_token)
        try:
            snapshot = await client.fetch(zone_id)
            _cache_put(zone_id, snapshot)
            logger.info("grid resolved via live API", zone_id=zone_id, quality="live")
            return snapshot
        except IngestionError as exc:
            logger.warning(
                "live API failed; trying cache",
                zone_id=zone_id,
                source=exc.source,
                error=str(exc),
            )
    else:
        logger.debug("no API token; skipping live step", zone_id=zone_id)

    # Step 2: Try cache
    cached = _cache_get(zone_id, settings.grid_cache_ttl_sec)
    if cached is not None:
        logger.info(
            "grid resolved via cache",
            zone_id=zone_id,
            quality=cached.quality,
            age_sec=cached.asOfAgeSec,
        )
        return cached

    # Step 3: Fall back to mock
    mock = MockGenerator(seed=settings.mock_seed)
    snapshot = await mock.fetch(zone_id)
    logger.info("grid resolved via mock (hybrid fallback)", zone_id=zone_id)
    return snapshot
