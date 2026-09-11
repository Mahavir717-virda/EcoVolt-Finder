"""
app/classify/__init__.py
────────────────────────
STUB — Renewable classification + zone mapping module.

Implements the fuel-mix taxonomy:
  renewable  = solar + wind + hydro + biomass + geothermal
  carbonFree = renewable + nuclear
  unknown    = flagged but excluded from numerators (never guessed)

GreennessBand thresholds:
  ≥80 → very_high | 65-79 → high | 50-64 → medium | 20-34 → low | <20 → very_low

Fully implemented in M3-C3.
"""
from __future__ import annotations

# M3-C3 will expose:
#   def classify_breakdown(breakdown: dict[str, float]) -> ClassifyResponse
#   def renewable_pct(breakdown: dict[str, float]) -> float
#   def carbon_free_pct(breakdown: dict[str, float]) -> float
#   def band_from_pct(pct: float) -> GreennessBand
