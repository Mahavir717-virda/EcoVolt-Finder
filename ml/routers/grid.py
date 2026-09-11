"""
routers/grid.py
───────────────
GET /grid/live   — live GridSnapshot for a zone  (wired to resolver in M3-C2)
GET /grid/forecast — 24-hour renewable % forecast (stub until M3-C5)

M3-C2: GET /grid/live now calls the real hybrid resolver.
       GRID_MODE governs the source: live → Electricity Maps; mock → MockGenerator;
       hybrid → live then cache then mock. Quality tag tells the client what was used.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.config import Settings, get_settings
from app.ingestion import resolve
from app.models import ForecastPoint, GridSnapshot

router = APIRouter(prefix="/grid", tags=["grid"])




# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/live", response_model=GridSnapshot, summary="Live GridSnapshot for a zone")
async def grid_live(
    zoneId:   Annotated[str, Query(description="Grid zone identifier, e.g. IN-WE")],
    settings: Annotated[Settings, Depends(get_settings)],
) -> GridSnapshot:
    """
    Returns the current grid greenness snapshot for the requested zone.

    **GRID_MODE behaviour:**
    - `live`   — calls Electricity Maps API; returns HTTP 503 on failure
    - `mock`   — returns seeded deterministic Indian-shaped data (quality=mock)
    - `hybrid` — tries live → cache → mock; never returns an error to the caller

    **Quality tag** in the response tells the client exactly what was used:
    `live` | `cached` | `stale` | `mock`

    **Edge cases:**
    - `renewablePct ≠ carbonFreePct` when nuclear is non-zero
    - `unknown` in breakdown is excluded from renewablePct numerator
    - All timestamps are UTC; IST conversion happens at the display layer
    """
    return await resolve(zone_id=zoneId, settings=settings)


@router.get(
    "/forecast",
    response_model=list[ForecastPoint],
    summary="24-hour renewable % forecast for a zone",
)
async def grid_forecast(
    zoneId: Annotated[str, Query(description="Grid zone identifier")],
    hours:  Annotated[int, Query(ge=1, le=72, description="Forecast horizon in hours")] = 24,
) -> list[ForecastPoint]:
    """
    Returns an hourly renewable-% forecast array (IST hour-start timestamps).
    confidence ∈ [0, 1] — low-confidence points are greyed in the UI.

    """
    from app.forecast import get_forecaster
    forecaster = get_forecaster(zoneId)
    return forecaster.predict(zoneId, hours)
