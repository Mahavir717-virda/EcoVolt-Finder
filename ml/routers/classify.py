"""
routers/classify.py
───────────────────
POST /classify — Classify a raw fuel-mix breakdown into renewable/carbon-free metrics.

Real classification logic is implemented in M3-C3.
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter

from app.models import ClassifyRequest, ClassifyResponse

router = APIRouter(prefix="/classify", tags=["classify"])




@router.post("", response_model=ClassifyResponse, summary="Classify fuel-mix into renewable/carbon-free metrics")
async def classify(body: ClassifyRequest) -> ClassifyResponse:
    """
    Accepts a raw fuel-mix breakdown (MW or proportional, normalised internally) and
    returns:

    - **renewablePct**: solar + wind + hydro + biomass + geothermal (0–100)
    - **carbonFreePct**: renewable + nuclear (0–100) — NOTE: nuclear is carbon-free but NOT renewable
    - **band**: GreennessBand label
    - **unclassifiedPct**: % of generation in 'unknown/other' — flagged, never guessed

    """
    from app.classify import compute_metrics, band_from_pct

    metrics = compute_metrics(body.breakdown)
    band = band_from_pct(metrics["renewablePct"])

    return ClassifyResponse(
        renewablePct=metrics["renewablePct"],
        carbonFreePct=metrics["carbonFreePct"],
        band=band,
        unclassifiedPct=metrics["unclassifiedPct"],
    )
