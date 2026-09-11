"""
routers/grid.py
───────────────
GET /grid/live   — live GridSnapshot for a zone
GET /grid/forecast — 24-hour renewable % forecast for a zone

M3-C1 stub: returns the /contracts/examples/ sample payloads verbatim.
Real ingestion is wired in M3-C2.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Query

from app.models import ForecastPoint, GridSnapshot

router = APIRouter(prefix="/grid", tags=["grid"])

# ── Load example payloads at import time (validated by Pydantic) ──────────────
_EXAMPLES = Path(__file__).parent.parent.parent / "contracts" / "examples"


def _load(filename: str):
    return json.loads((_EXAMPLES / filename).read_text(encoding="utf-8"))


_GRID_LIVE_EXAMPLE     = GridSnapshot.model_validate(_load("grid_live.json"))
_GRID_FORECAST_EXAMPLE = [
    ForecastPoint.model_validate(pt) for pt in _load("grid_forecast.json")
]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/live", response_model=GridSnapshot, summary="Live GridSnapshot for a zone")
async def grid_live(
    zoneId: Annotated[str, Query(description="Grid zone identifier, e.g. IN-WE")],
) -> GridSnapshot:
    """
    Returns the current grid greenness snapshot for the requested zone.

    **M3-C1 stub**: returns the sample payload from /contracts/examples/grid_live.json.
    The `quality` field will be `mock` until M3-C2 wires real ingestion.

    GRID_MODE threading: live → Electricity Maps API; hybrid → live then cache then mock;
    mock → MockGenerator (seeded). Implemented in M3-C2.
    """
    # In M3-C2 this becomes:
    #   snapshot = await ingestion.resolve(zone_id=zoneId, settings=settings)
    #   return snapshot
    return _GRID_LIVE_EXAMPLE


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

    **M3-C1 stub**: returns the sample payload from /contracts/examples/grid_forecast.json
    (sliced to the requested `hours` if shorter than the sample).
    """
    return _GRID_FORECAST_EXAMPLE[:hours]
