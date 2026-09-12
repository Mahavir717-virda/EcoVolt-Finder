"""
app/classify/metrics.py
────────────────────────
Metrics computation for grid greenness.
"""
from __future__ import annotations

from app.classify.taxonomy import EXCLUDE_KEYS, get_carbon_free_keys, get_renewable_keys
from app.models import GreennessBand

EMISSION_FACTORS: dict[str, float] = {
    "coal": 820.0,
    "gas": 490.0,
    "oil": 650.0,
    "biomass": 230.0,
    "nuclear": 12.0,
    "hydro": 24.0,
    "solar": 45.0,
    "wind": 11.0,
    "geothermal": 38.0,
    "unknown": 650.0,
}

def compute_carbon_intensity(breakdown: dict[str, float]) -> float:
    """
    Computes dynamic weighted carbon intensity (gCO2eq/kWh) from the live generation breakdown.
    Based on standard CEA (Central Electricity Authority of India) and IPCC lifecycle factors.
    """
    total_mw = sum(max(0.0, v) for v in breakdown.values())
    if total_mw <= 0:
        return 420.0
    total_emissions = sum(max(0.0, mw) * EMISSION_FACTORS.get(k.lower(), 650.0) for k, mw in breakdown.items())
    return round(total_emissions / total_mw, 1)

def compute_metrics(breakdown: dict[str, float]) -> dict[str, float]:
    """
    Returns a dictionary with renewablePct, carbonFreePct, and unclassifiedPct.
    'unknown'/'other' are excluded from the known total.
    """
    total_all = sum(v for v in breakdown.values() if v > 0)
    if total_all <= 0:
        return {"renewablePct": 0.0, "carbonFreePct": 0.0, "unclassifiedPct": 0.0}

    total_known = sum(v for k, v in breakdown.items() if k not in EXCLUDE_KEYS and v > 0)
    unclassified_mw = sum(v for k, v in breakdown.items() if k in EXCLUDE_KEYS and v > 0)

    unclassified_pct = min(100.0, max(0.0, unclassified_mw / total_all * 100.0))

    if total_known <= 0:
        return {"renewablePct": 0.0, "carbonFreePct": 0.0, "unclassifiedPct": unclassified_pct}

    renewable_keys = get_renewable_keys()
    carbon_free_keys = get_carbon_free_keys()

    renewable_mw = sum(breakdown.get(k, 0.0) for k in renewable_keys)
    carbon_free_mw = sum(breakdown.get(k, 0.0) for k in carbon_free_keys)

    renewable_pct = min(100.0, max(0.0, renewable_mw / total_known * 100.0))
    carbon_free_pct = min(100.0, max(0.0, carbon_free_mw / total_known * 100.0))

    return {
        "renewablePct": renewable_pct,
        "carbonFreePct": carbon_free_pct,
        "unclassifiedPct": unclassified_pct
    }

def renewable_percentage(breakdown: dict[str, float]) -> float:
    return compute_metrics(breakdown)["renewablePct"]

def carbon_free_percentage(breakdown: dict[str, float]) -> float:
    return compute_metrics(breakdown)["carbonFreePct"]

def band_from_pct(renewable_pct: float) -> GreennessBand:
    """Map renewable % to GreennessBand."""
    if renewable_pct >= 80:
        return "very_high"
    elif renewable_pct >= 65:
        return "high"
    elif renewable_pct >= 50:
        return "medium"
    elif renewable_pct >= 20:
        return "low"
    else:
        return "very_low"
