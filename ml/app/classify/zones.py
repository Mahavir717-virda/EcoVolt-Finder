"""
app/classify/zones.py
──────────────────────
Station to Zone mapping.
"""
from __future__ import annotations

# Small station-zone table for the demo
# Mapping from stationId to zoneId
STATION_ZONES = {
    "STAT-001": "IN-WE",
    "STAT-002": "IN-SO",
    "STAT-003": "IN-NO",
}

def get_zone_for_station(station_id: str, default_zone: str = "IN-WE") -> str:
    """
    Looks up the zoneId for a given stationId.
    Defaults to `default_zone` if not found.
    """
    return STATION_ZONES.get(station_id, default_zone)
