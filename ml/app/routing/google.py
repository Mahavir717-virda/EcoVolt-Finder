"""
app/routing/google.py
─────────────────────
Google Routes API client with haversine fallback and in-memory caching.
"""
from __future__ import annotations

import math
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


# Simple in-memory cache
_ROUTE_CACHE: dict[tuple[float, float, float, float], tuple[float, float]] = {}
MAX_CACHE_SIZE = 10000

def _round_coord(coord: float) -> float:
    return round(coord, 4)

def _get_from_cache(p1: GeoPoint, p2: GeoPoint) -> tuple[float, float] | None:
    key = (_round_coord(p1.lat), _round_coord(p1.lng), _round_coord(p2.lat), _round_coord(p2.lng))
    return _ROUTE_CACHE.get(key)

def _add_to_cache(p1: GeoPoint, p2: GeoPoint, dist_km: float, time_min: float) -> None:
    if len(_ROUTE_CACHE) > MAX_CACHE_SIZE:
        _ROUTE_CACHE.clear()
    key = (_round_coord(p1.lat), _round_coord(p1.lng), _round_coord(p2.lat), _round_coord(p2.lng))
    _ROUTE_CACHE[key] = (dist_km, time_min)

async def route_matrix(origin: GeoPoint, station_coords: list[GeoPoint], api_key: str | None) -> RouteMatrixResponse:
    """
    Computes distance and duration to multiple destinations.
    Uses Google Routes API v2 (computeRouteMatrix).
    Falls back to Haversine if API fails, API key is absent, or quota exceeded.
    """
    results: list[RouteResult | None] = []
    
    uncached_destinations = []
    uncached_indices = []
    
    for i, dest in enumerate(station_coords):
        cached = _get_from_cache(origin, dest)
        if cached:
            results.append(RouteResult(distanceKm=cached[0], travelMinutes=cached[1], isEstimated=False))
        else:
            results.append(None)
            uncached_destinations.append(dest)
            uncached_indices.append(i)

    if uncached_destinations and api_key:
        url = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
        origins = [{"waypoint": {"location": {"latLng": {"latitude": origin.lat, "longitude": origin.lng}}}}]
        destinations = [{"waypoint": {"location": {"latLng": {"latitude": d.lat, "longitude": d.lng}}}} for d in uncached_destinations]
        
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
                for element in data:
                    dest_idx = element.get("destinationIndex", 0)
                    condition = element.get("condition")
                    
                    if condition == "ROUTE_EXISTS" and "distanceMeters" in element and "duration" in element:
                        dist_km = element["distanceMeters"] / 1000.0
                        duration_sec = float(element["duration"].rstrip("s"))
                        travel_min = duration_sec / 60.0
                        
                        original_idx = uncached_indices[dest_idx]
                        dest = uncached_destinations[dest_idx]
                        
                        _add_to_cache(origin, dest, dist_km, travel_min)
                        results[original_idx] = RouteResult(distanceKm=dist_km, travelMinutes=travel_min, isEstimated=False)
            else:
                logger.warning("google_routes_api_failed", status=resp.status_code, body=resp.text)
        except Exception as e:
            logger.error("google_routes_api_error", error=str(e))
            
    # Fallback to Haversine
    final_results = []
    for i in range(len(results)):
        res = results[i]
        if res is None:
            dest = station_coords[i]
            dist_km = haversine_km(origin, dest)
            travel_min = (dist_km / CITY_SPEED_KMH) * 60.0
            res = RouteResult(distanceKm=dist_km, travelMinutes=travel_min, isEstimated=True)
        final_results.append(res)

    return RouteMatrixResponse(results=final_results)

async def route(origin: GeoPoint, dest: GeoPoint, api_key: str | None) -> dict:
    """
    Computes a single route returning distance, time, and an encoded polyline.
    Uses Google Routes API v2 (computeRoutes).
    """
    if not api_key:
        # Fallback without polyline
        dist_km = haversine_km(origin, dest)
        travel_min = (dist_km / CITY_SPEED_KMH) * 60.0
        return {
            "distanceKm": dist_km,
            "travelMinutes": travel_min,
            "polyline": "",
            "isEstimated": True
        }
        
    url = "https://routes.googleapis.com/directions/v2:computeRoutes"
    payload = {
        "origin": {"location": {"latLng": {"latitude": origin.lat, "longitude": origin.lng}}},
        "destination": {"location": {"latLng": {"latitude": dest.lat, "longitude": dest.lng}}},
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE"
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline"
    }
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            
        if resp.status_code == 200:
            data = resp.json()
            if "routes" in data and len(data["routes"]) > 0:
                r = data["routes"][0]
                dist_km = r.get("distanceMeters", 0) / 1000.0
                dur_str = r.get("duration", "0s")
                travel_min = float(dur_str.rstrip("s")) / 60.0
                polyline = r.get("polyline", {}).get("encodedPolyline", "")
                
                return {
                    "distanceKm": dist_km,
                    "travelMinutes": travel_min,
                    "polyline": polyline,
                    "isEstimated": False
                }
    except Exception as e:
        logger.error("google_route_error", error=str(e))
        
    # Fallback
    dist_km = haversine_km(origin, dest)
    travel_min = (dist_km / CITY_SPEED_KMH) * 60.0
    return {
        "distanceKm": dist_km,
        "travelMinutes": travel_min,
        "polyline": "",
        "isEstimated": True
    }

async def geocode(query: str, api_key: str | None) -> GeoPoint | None:
    """
    Translates a text address to a GeoPoint using the Geocoding API.
    """
    if not api_key:
        return None
        
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": query,
        "key": api_key
    }
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "OK" and len(data.get("results", [])) > 0:
                loc = data["results"][0]["geometry"]["location"]
                return GeoPoint(lat=loc["lat"], lng=loc["lng"])
    except Exception as e:
        logger.error("google_geocode_error", error=str(e))
        
    return None
