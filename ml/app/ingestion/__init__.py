"""
app/ingestion/__init__.py
─────────────────────────
Public API for the ingestion module (M3-C2).

Usage:
    from app.ingestion import resolve
    snapshot = await resolve(zone_id="IN-WE", settings=settings)

The resolver handles GRID_MODE routing, caching, and quality tagging.
Callers always receive a valid GridSnapshot — never None, never an exception
(except HTTPException(503) in live mode on API failure).
"""
from __future__ import annotations

from app.ingestion.base import GridSource, IngestionError
from app.ingestion.electricity_maps import ElectricityMapsClient
from app.ingestion.greenness import band_from_pct, compute_pcts
from app.ingestion.india_atlas import IndiaAtlasClient
from app.ingestion.mock_generator import MockGenerator
from app.ingestion.resolver import clear_cache, resolve

__all__ = [
    "resolve",
    "clear_cache",
    "GridSource",
    "IngestionError",
    "ElectricityMapsClient",
    "IndiaAtlasClient",
    "MockGenerator",
    "compute_pcts",
    "band_from_pct",
]
