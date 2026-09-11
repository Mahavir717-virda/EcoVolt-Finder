"""
app/routing/__init__.py
───────────────────────
Google Routes / Distance Matrix client + haversine fallback module.
"""
from __future__ import annotations

from app.routing.google import haversine_km, route_matrix, route, geocode

__all__ = [
    "haversine_km",
    "route_matrix",
    "route",
    "geocode"
]
