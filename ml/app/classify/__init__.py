"""
app/classify/__init__.py
────────────────────────
Renewable classification + zone mapping module.
"""
from __future__ import annotations

from app.classify.metrics import (
    band_from_pct,
    carbon_free_percentage,
    compute_metrics,
    renewable_percentage,
)
from app.classify.taxonomy import (
    CARBON_FREE_EXTRA,
    FOSSIL,
    HYDRO_IS_RENEWABLE,
    RENEWABLE_BASE,
    get_carbon_free_keys,
    get_renewable_keys,
)
from app.classify.zones import get_zone_for_station

__all__ = [
    "compute_metrics",
    "renewable_percentage",
    "carbon_free_percentage",
    "band_from_pct",
    "get_zone_for_station",
    "get_renewable_keys",
    "get_carbon_free_keys",
    "HYDRO_IS_RENEWABLE",
    "RENEWABLE_BASE",
    "CARBON_FREE_EXTRA",
    "FOSSIL",
]
