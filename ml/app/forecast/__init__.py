"""
app/forecast/__init__.py
────────────────────────
STUB — Feature engineering + forecasting module.

Generates 24–72 hour renewable % forecasts with confidence scores.
IST hour-start timestamps are used in all forecast outputs.

Key decisions:
  • Confidence decays with horizon (near-term = high confidence)
  • Low-confidence points are flagged; UI greys them — never hidden
  • Historical store + feature engineering implemented in M3-C4

Fully implemented in M3-C5.
"""
from __future__ import annotations

# M3-C4/C5 will expose:
#   async def forecast(zone_id: str, hours: int, settings) -> list[ForecastPoint]
#   def build_features(snapshots: list[GridSnapshot]) -> pd.DataFrame
