"""
app/pricing/__init__.py
───────────────────────
Time-of-use (ToU) + greenness cost estimator (windows) module.

Computes per-hour charging windows combining:
  • Base tariff (₹/kWh) provided by the client
  • ToU adjustment (negative = green discount)
  • Renewable % forecast from the forecast module

finalPrice = baseTariff + providerMarkup + touAdjustment
isEstimate = true when any component is a model proxy, not a published tariff
"""
from __future__ import annotations

from app.pricing.windows import estimate_windows, best_window, get_tou_adjustment

__all__ = [
    "estimate_windows",
    "best_window",
    "get_tou_adjustment",
]
