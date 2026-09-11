"""tests/test_smartcharge_logic.py — Test for M3-C10"""
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.recommend.smartcharge import now_ist, format_ist

def get_future_ist(hours=5):
    return format_ist(now_ist() + timedelta(hours=hours))

def get_past_ist(hours=1):
    return format_ist(now_ist() - timedelta(hours=hours))

PAYLOAD = {
    "zoneId": "IN",
    "stationId": "station-001",
    "chargeRateKw": 10.0,
    "energyNeededKwh": 20.0, # 2 hours
    "urgent": False,
    "tariff": 6.2,
}

def test_smartcharge_urgent(client: TestClient) -> None:
    p = {**PAYLOAD, "urgent": True, "deadlineLocal": get_future_ist(10)}
    data = client.post("/smartcharge/plan", json=p).json()
    assert data["isImmediate"] is True
    assert "Urgent mode" in data["note"]

def test_smartcharge_infeasible_deadline(client: TestClient) -> None:
    # Need 2 hours of charging, but deadline is 1 hour away
    p = {**PAYLOAD, "urgent": False, "deadlineLocal": get_future_ist(1)}
    data = client.post("/smartcharge/plan", json=p).json()
    assert data["isImmediate"] is True
    assert "Cannot complete full" in data["note"]

def test_smartcharge_normal_optimization(client: TestClient) -> None:
    # Plenty of time to optimize
    p = {**PAYLOAD, "urgent": False, "deadlineLocal": get_future_ist(24)}
    data = client.post("/smartcharge/plan", json=p).json()
    
    assert "isImmediate" in data
    # Either it charges now because it's already optimal, or it finds a better window
    if not data["isImmediate"]:
        assert "Optimal window found" in data["note"]
        assert data["expectedRenewablePct"] >= 0.0
    else:
        assert "already optimal" in data["note"]
