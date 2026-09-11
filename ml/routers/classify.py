"""
routers/classify.py
───────────────────
POST /classify — Classify a raw fuel-mix breakdown into renewable/carbon-free metrics.

M3-C1 stub: returns the /contracts/examples/classify.json sample payload verbatim.
Real classification logic is implemented in M3-C3.
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter

from app.models import ClassifyRequest, ClassifyResponse

router = APIRouter(prefix="/classify", tags=["classify"])

_EXAMPLES = Path(__file__).parent.parent.parent / "contracts" / "examples"
_CLASSIFY_EXAMPLE = ClassifyResponse.model_validate(
    json.loads((_EXAMPLES / "classify.json").read_text(encoding="utf-8"))
)


@router.post("", response_model=ClassifyResponse, summary="Classify fuel-mix into renewable/carbon-free metrics")
async def classify(body: ClassifyRequest) -> ClassifyResponse:
    """
    Accepts a raw fuel-mix breakdown (MW or proportional, normalised internally) and
    returns:

    - **renewablePct**: solar + wind + hydro + biomass + geothermal (0–100)
    - **carbonFreePct**: renewable + nuclear (0–100) — NOTE: nuclear is carbon-free but NOT renewable
    - **band**: GreennessBand label
    - **unclassifiedPct**: % of generation in 'unknown/other' — flagged, never guessed

    **M3-C1 stub**: returns the sample from /contracts/examples/classify.json.
    Real taxonomy is implemented in M3-C3.
    """
    return _CLASSIFY_EXAMPLE
