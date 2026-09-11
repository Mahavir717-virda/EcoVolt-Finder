"""
app/routing/client.py
─────────────────────
Google Routes API client with haversine fallback and in-memory caching.
"""
from __future__ import annotations

import math
from functools import lru_cache
from typing import Tuple

import httpx
from structlog import get_logger

from app.models import GeoPoint, RouteMatrixResponse, RouteResult

logger = get_logger(__name__)

# Constants for Haversine
EARTH_RADIUS_KM = 6371.0
CITY_SPEED_KMH = 30.0  # Assumed average speed for fallback


def haversine_km(p1: GeoPoint, p2: GeoPoint) -> float:
    """Computes the great-circle distance between two points in km."""
    lat1, lon1 = math.radians(p1.lat), math.radians(p1.lng)
    lat2, lon2 = math.radians(p2.lat), math.radians(p2.lng)

    dlon = lon2 - lon1
    dlat = lat2 - lat1

    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    return EARTH_RADIUS_KM * c


# Simple in-memory cache using lru_cache. 
# Key is a tuple of rounded coordinates (4 decimal places is approx 11m precision).
@lru_cache(maxsize=4096)
def _get_cached_route(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Tuple[float, float] | None:
    return None

def _set_cached_route(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float, dist_km: float, time_min: float) -> None:
    # lru_cache is read-only essentially, so we'll just use a module-level dict
    pass

# Let's use a dict with bounded size for caching
_ROUTE_CACHE: dict[tuple[float, float, float, float], tuple[float, float]] = {}
MAX_CACHE_SIZE = 10000

def _round_coord(coord: float) -> float:
    return round(coord, 4)

def _get_from_cache(p1: GeoPoint, p2: GeoPoint) -> tuple[float, float] | None:
    key = (_round_coord(p1.lat), _round_coord(p1.lng), _round_coord(p2.lat), _round_coord(p2.lng))
    return _ROUTE_CACHE.get(key)

def _add_to_cache(p1: GeoPoint, p2: GeoPoint, dist_km: float, time_min: float) -> None:
    if len(_ROUTE_CACHE) > MAX_CACHE_SIZE:
        # naive eviction: clear cache when full
        _ROUTE_CACHE.clear()
    key = (_round_coord(p1.lat), _round_coord(p1.lng), _round_coord(p2.lat), _round_coord(p2.lng))
    _ROUTE_CACHE[key] = (dist_km, time_min)


async def route_matrix(origin: GeoPoint, station_coords: list[GeoPoint], api_key: str | None) -> RouteMatrixResponse:
    """
    Computes distance and duration to multiple destinations.
    Uses Google Routes API v2 (computeRouteMatrix).
    Falls back to Haversine if API fails, API key is absent, or quota exceeded.
    """
    results: list[RouteResult] = []
    
    # 1. Try to fulfill from cache first
    uncached_destinations = []
    uncached_indices = []
    
    for i, dest in enumerate(station_coords):
        cached = _get_from_cache(origin, dest)
        if cached:
            results.append(RouteResult(distanceKm=cached[0], travelMinutes=cached[1], isEstimated=False))
        else:
            results.append(None) # placeholder
            uncached_destinations.append(dest)
            uncached_indices.append(i)

    # 2. Call Google API for uncached destinations
    if uncached_destinations and api_key:
        url = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
        
        origins = [{
            "waypoint": {
                "location": {
                    "latLng": {"latitude": origin.lat, "longitude": origin.lng}
                }
            },
            "routeModifiers": {"avoidTolls": False}
        }]
        
        destinations = [{
            "waypoint": {
                "location": {
                    "latLng": {"latitude": d.lat, "longitude": d.lng}
                }
            }
        } for d in uncached_destinations]
        
        payload = {
            "origins": origins,
            "destinations": destinations,
            "travelMode": "DRIVE",
            "routingPreference": "TRAFFIC_AWARE"
        }
        
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,condition"
        }
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                
            if resp.status_code == 200:
                data = resp.json()
                # Elements can be returned in any order, so we use originIndex and destinationIndex
                for element in data:
                    dest_idx = element.get("destinationIndex", 0)
                    condition = element.get("condition")
                    
                    if condition == "ROUTE_EXISTS" and "distanceMeters" in element and "duration" in element:
                        dist_km = element["distanceMeters"] / 1000.0
                        duration_str = element["duration"]
                        # duration is string like "1800s"
                        duration_sec = float(duration_str.rstrip("s"))
                        travel_min = duration_sec / 60.0
                        
                        original_idx = uncached_indices[dest_idx]
                        dest = uncached_destinations[dest_idx]
                        
                        _add_to_cache(origin, dest, dist_km, travel_min)
                        results[original_idx] = RouteResult(distanceKm=dist_km, travelMinutes=travel_min, isEstimated=False)
            else:
                logger.warning("google_routes_api_failed", status=resp.status_code, body=resp.text)
        except Exception as e:
            logger.error("google_routes_api_error", error=str(e))
            
    # 3. Fallback to Haversine for any missing results
    for i in range(len(results)):
        if results[i] is None:
            dest = station_coords[i]
            dist_km = haversine_km(origin, dest)
            travel_min = (dist_km / CITY_SPEED_KMH) * 60.0
            results[i] = RouteResult(distanceKm=dist_km, travelMinutes=travel_min, isEstimated=True)

    # 4. Final safety check: ensure no None values
    final_results = [r for r in results if r is not None]

    return RouteMatrixResponse(results=final_results)
