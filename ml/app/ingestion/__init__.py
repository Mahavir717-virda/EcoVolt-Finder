"""
app/ingestion/__init__.py
─────────────────────────
STUB — Grid data ingestion module.

Implements the resolver pattern that routes requests based on GRID_MODE:
  live   → Electricity Maps API (or India Energy Atlas fallback)
  mock   → MockGenerator (seeded deterministic)
  hybrid → live → cached → mock

Fully implemented in M3-C2.
"""
from __future__ import annotations

# M3-C2 will expose:
#   async def resolve(zone_id: str, settings) -> GridSnapshot
#   class MockGenerator
#   class ElectricityMapsClient
