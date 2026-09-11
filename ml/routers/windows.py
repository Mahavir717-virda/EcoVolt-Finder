"""
routers/windows.py
──────────────────
POST /estimate/windows — Per-hour cost + greenness window estimates.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.models import WindowsRequest, WindowsResponse
from app.pricing import estimate_windows as pricing_estimate_windows

router = APIRouter(prefix="/estimate", tags=["windows"])


@router.post(
    "/windows",
    response_model=WindowsResponse,
    summary="Per-hour cost + greenness window estimates",
)
async def estimate_windows(body: WindowsRequest) -> WindowsResponse:
    """
    Returns an array of hourly charging windows with estimated renewable % and ₹/kWh,
    plus the single best window (greenest + cheapest combined).

    `bestWindow` is the window the UI should highlight for the driver.
    """
    return pricing_estimate_windows(
        zone_id=body.zoneId,
        tariff=body.tariff,
        hours=body.hours,
        duration_h=body.durationH
    )
