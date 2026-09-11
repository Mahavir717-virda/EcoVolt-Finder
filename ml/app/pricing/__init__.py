"""
app/pricing/__init__.py
───────────────────────
STUB — Time-of-use (ToU) + greenness cost estimator (windows) module.

Computes per-hour charging windows combining:
  • Base tariff (₹/kWh) provided by the client
  • ToU adjustment (negative = green discount)
  • Renewable % forecast from the forecast module

finalPrice = baseTariff + providerMarkup + touAdjustment
isEstimate = true when any component is a model proxy, not a published tariff

Fully implemented in M3-C6.
"""
from __future__ import annotations

# M3-C6 will expose:
#   async def estimate_windows(zone_id: str, tariff: float, hours: int, settings) -> WindowsResponse
