"""tests/test_recommend_trap.py — Test for M3-C9"""
import pytest
from fastapi.testclient import TestClient

TRAP_PAYLOAD = {
    "origin": {"lat": 23.0, "lng": 72.0},
    "vehicle": {
        "vehicleClass": "car",
        "batteryKwh": 50.0,
        "efficiencyWhKm": 150.0,
        "connectors": ["ccs2"],
        "currentChargePct": 50,
    },
    "kwh": 20.0,
    "candidateStations": [
        {
            "id": "station-near-expensive",
            "location": {"lat": 23.01, "lng": 72.0},  # ~1.1km away
            "connectors": ["ccs2"],
            "finalPricePerKwh": 10.0,
            "provider": "near",
        },
        {
            "id": "station-far-cheap",
            "location": {"lat": 23.2, "lng": 72.0},  # ~22km away
            "connectors": ["ccs2"],
            "finalPricePerKwh": 8.0, # Looks cheaper!
            "provider": "far",
        },
        {
            "id": "station-incompatible",
            "location": {"lat": 23.01, "lng": 72.0},
            "connectors": ["chademo"], # Incompatible
            "finalPricePerKwh": 5.0,
            "provider": "incompatible",
        },
        {
            "id": "station-unreachable",
            "location": {"lat": 25.0, "lng": 72.0}, # Super far (~222km, max range is ~166km)
            "connectors": ["ccs2"],
            "finalPricePerKwh": 1.0,
            "provider": "unreachable",
        }
    ],
}

def test_recommend_sticker_trap(client: TestClient) -> None:
    data = client.post("/recommend", json=TRAP_PAYLOAD).json()
    
    assert len(data) == 4
    
    # 1. Check order: near-expensive should beat far-cheap because of travel cost
    top_station = data[0]
    assert top_station["stationId"] == "station-near-expensive"
    
    # 2. Check sticker trap delta
    assert top_station["vsCheapestSticker"] > 0
    assert "less overall than the cheapest sticker price" in top_station["reason"]
    
    # 3. Check incompatible is sorted lower and flagged
    incomp = next(s for s in data if s["stationId"] == "station-incompatible")
    assert incomp["connectorCompatible"] is False
    assert "support your vehicle's connector type" in incomp["reason"]
    
    # 4. Check unreachable is sorted lower and flagged
    unreach = next(s for s in data if s["stationId"] == "station-unreachable")
    assert unreach["reachable"] is False
    assert "enough battery to reach this station" in unreach["reason"]
