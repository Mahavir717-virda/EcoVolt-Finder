"""
app/routing/__init__.py
───────────────────────
STUB — Google Routes / Distance Matrix client + haversine fallback module.

Strategy:
  1. Pre-filter to nearest K stations by haversine (done upstream by Node service M2)
  2. Call Google Routes API for accurate distance + time
  3. On quota exhaustion or API error: fall back to haversine estimate (isEstimated=true)

isEstimated = true in RouteResult when haversine fallback was used.

Fully implemented in M3-C7.
"""
from __future__ import annotations

# M3-C7 will expose:
#   async def route_matrix(origin: GeoPoint, station_coords: list[GeoPoint], settings) -> RouteMatrixResponse
#   def haversine_km(p1: GeoPoint, p2: GeoPoint) -> float
