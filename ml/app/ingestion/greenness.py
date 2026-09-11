"""
app/ingestion/greenness.py
──────────────────────────
Shared renewable/carbon-free computation helpers.
Used by all ingestion sources so the same taxonomy is applied everywhere.

Taxonomy (from /contracts/types.ts and EDGE_CASES.md):
  renewable  = solar + wind + hydro + biomass + geothermal
  carbonFree = renewable + nuclear
  unknown    = EXCLUDED from numerators — flagged but never guessed

GreennessBand thresholds (from /contracts/enums.ts):
  ≥80 → very_high | 65–79 → high | 50–64 → medium | 20–34 → low | <20 → very_low
  (35–49 maps to low per the code — no unlabelled gap)
"""
from __future__ import annotations

from app.models import GreennessBand

# ── Renewable fuel keys ───────────────────────────────────────────────────────

_RENEWABLE_KEYS = frozenset({"solar", "wind", "hydro", "biomass", "geothermal"})
_CARBON_FREE_EXTRA = frozenset({"nuclear"})  # not renewable, but carbon-free
_EXCLUDE_KEYS = frozenset({"unknown"})       # never counted in numerators


def compute_pcts(breakdown: dict[str, float]) -> tuple[float, float]:
    """
    Returns (renewable_pct, carbon_free_pct) from a MW breakdown dict.

    Rules:
    • 'unknown' is excluded from both numerators AND the denominator
      (we don't know what it is — we never guess)
    • If total known MW = 0, returns (0.0, 0.0)
    """
    total = sum(v for k, v in breakdown.items() if k not in _EXCLUDE_KEYS and v > 0)
    if total <= 0:
        return 0.0, 0.0

    renewable_mw  = sum(breakdown.get(k, 0.0) for k in _RENEWABLE_KEYS)
    nuclear_mw    = breakdown.get("nuclear", 0.0)
    carbon_free_mw = renewable_mw + nuclear_mw

    renewable_pct  = min(100.0, max(0.0, renewable_mw  / total * 100.0))
    carbon_free_pct = min(100.0, max(0.0, carbon_free_mw / total * 100.0))
    return renewable_pct, carbon_free_pct


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
