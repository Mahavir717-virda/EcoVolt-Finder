"""tests/test_smartcharge.py — POST /smartcharge/plan"""
from fastapi.testclient import TestClient

PAYLOAD = {
    "zoneId": "IN-WE",
    "stationId": "station-001",
    "chargeRateKw": 22.0,
    "energyNeededKwh": 18.0,
    "deadlineLocal": "2026-09-12T15:00:00+05:30",
    "urgent": False,
    "tariff": 6.2,
}


def test_smartcharge_plan_200(client: TestClient) -> None:
    r = client.post("/smartcharge/plan", json=PAYLOAD)
    assert r.status_code == 200


def test_smartcharge_plan_schema(client: TestClient) -> None:
    data = client.post("/smartcharge/plan", json=PAYLOAD).json()
    required = {
        "startLocal", "endLocal", "expectedRenewablePct",
        "expectedSavings", "confidence", "isImmediate",
    }
    assert required.issubset(data.keys()), f"Missing fields: {required - data.keys()}"


def test_smartcharge_plan_confidence_range(client: TestClient) -> None:
    data = client.post("/smartcharge/plan", json=PAYLOAD).json()
    assert 0 <= data["confidence"] <= 1


def test_smartcharge_urgent_field(client: TestClient) -> None:
    data = client.post("/smartcharge/plan", json={**PAYLOAD, "urgent": True}).json()
    assert isinstance(data["isImmediate"], bool)
