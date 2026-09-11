"""tests/test_recommend.py — POST /recommend"""
from fastapi.testclient import TestClient

PAYLOAD = {
    "origin": {"lat": 23.0225, "lng": 72.5714},
    "vehicle": {
        "vehicleClass": "car",
        "batteryKwh": 40.0,
        "efficiencyWhKm": 160,
        "connectors": ["ccs2", "type2_ac"],
        "currentChargePct": 20,
    },
    "kwh": 18.0,
    "candidateStations": [
        {
            "id": "station-001",
            "location": {"lat": 23.0300, "lng": 72.5800},
            "connectors": ["ccs2"],
            "finalPricePerKwh": 6.2,
            "provider": "torrent_power",
        },
        {
            "id": "station-002",
            "location": {"lat": 23.0150, "lng": 72.5600},
            "connectors": ["type2_ac"],
            "finalPricePerKwh": 5.8,
            "provider": "adani_energy",
        },
    ],
}


def test_recommend_200(client: TestClient) -> None:
    r = client.post("/recommend", json=PAYLOAD)
    assert r.status_code == 200


def test_recommend_returns_list(client: TestClient) -> None:
    data = client.post("/recommend", json=PAYLOAD).json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_recommend_station_fields(client: TestClient) -> None:
    data = client.post("/recommend", json=PAYLOAD).json()
    s = data[0]
    required = {
        "stationId", "distanceKm", "travelMinutes", "energyNeededKwh",
        "chargingCost", "travelCost", "trueTotalCost", "vsCheapestSticker",
        "reachable", "connectorCompatible", "reason",
    }
    assert required.issubset(s.keys()), f"Missing recommendation fields: {required - s.keys()}"


def test_recommend_true_total_cost(client: TestClient) -> None:
    """trueTotalCost must equal chargingCost + travelCost (within float tolerance)."""
    data = client.post("/recommend", json=PAYLOAD).json()
    for s in data:
        expected = s["chargingCost"] + s["travelCost"]
        assert abs(s["trueTotalCost"] - expected) < 0.01, (
            f"trueTotalCost mismatch for {s['stationId']}: "
            f"{s['trueTotalCost']} != {expected}"
        )
