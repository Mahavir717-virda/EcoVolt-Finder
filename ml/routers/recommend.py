"""
routers/recommend.py
────────────────────
POST /recommend — Rank candidate stations by true total cost (charging + travel).

M3-C1 stub: returns the /contracts/examples/recommend.json sample payload.
Real recommendation engine is implemented in M3-C9.
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter

from app.models import RecommendRequest, StationRecommendation

router = APIRouter(prefix="/recommend", tags=["recommend"])

_EXAMPLES = Path(__file__).parent.parent.parent / "contracts" / "examples"
_RECOMMEND_EXAMPLE = [
    StationRecommendation.model_validate(item)
    for item in json.loads((_EXAMPLES / "recommend.json").read_text(encoding="utf-8"))
]


@router.post(
    "",
    response_model=list[StationRecommendation],
    summary="Rank candidate stations by true total cost (charging + travel)",
)
async def recommend(body: RecommendRequest) -> list[StationRecommendation]:
    """
    Accepts an origin, vehicle spec, energy needed, and a list of pre-filtered
    candidate stations. Returns them ranked by **trueTotalCost** (ascending).

    **Key edge case — don't rank by sticker price alone:**
    `trueTotalCost = chargingCost + travelCost`
    A station that looks cheaper per-kWh but is farther may rank lower once
    travelCost is included. `vsCheapestSticker` exposes this trap to the user.

    - `reachable = false` stations are shown greyed.
    - `connectorCompatible = false` stations are hidden by default.

    """
    from app.recommend import recommend as engine_recommend
    return await engine_recommend(body)
