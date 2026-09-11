"""
app/routing/__init__.py
───────────────────────
Google Routes / Distance Matrix client + haversine fallback module.

Strategy:
  1. Pre-filter to nearest K stations by haversine (done upstream by Node service M2)
  2. Call Google Routes API for accurate distance + time
  3. On quota exhaustion or API error: fall back to haversine estimate (isEstimated=true)

isEstimated = true in RouteResult when haversine fallback was used.
"""
from __future__ import annotations

from app.routing.client import haversine_km, route_matrix

__all__ = [
    "haversine_km",
    "route_matrix",
]
