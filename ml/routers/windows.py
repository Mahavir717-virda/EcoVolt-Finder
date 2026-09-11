"""
routers/windows.py
──────────────────
POST /estimate/windows — Per-hour cost + greenness window estimates.

M3-C1 stub: returns the /contracts/examples/estimate_windows.json sample payload.
Real pricing/ToU logic is implemented in M3-C6.
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter

from app.models import WindowsRequest, WindowsResponse

router = APIRouter(prefix="/estimate", tags=["windows"])

_EXAMPLES = Path(__file__).parent.parent.parent / "contracts" / "examples"
_WINDOWS_EXAMPLE = WindowsResponse.model_validate(
    json.loads((_EXAMPLES / "estimate_windows.json").read_text(encoding="utf-8"))
)


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

    **M3-C1 stub**: returns the sample from /contracts/examples/estimate_windows.json.
    Real ToU pricing + greenness logic is implemented in M3-C6.
    """
    return _WINDOWS_EXAMPLE
