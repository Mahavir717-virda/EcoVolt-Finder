"""tests/test_windows.py — POST /estimate/windows"""
from fastapi.testclient import TestClient

PAYLOAD = {"zoneId": "IN-WE", "tariff": 8.5, "hours": 24, "durationH": 1.5}


def test_windows_200(client: TestClient) -> None:
    r = client.post("/estimate/windows", json=PAYLOAD)
    assert r.status_code == 200


def test_windows_schema(client: TestClient) -> None:
    data = client.post("/estimate/windows", json=PAYLOAD).json()
    assert "windows" in data
    assert "bestWindow" in data
    assert isinstance(data["windows"], list)


def test_windows_window_fields(client: TestClient) -> None:
    data = client.post("/estimate/windows", json=PAYLOAD).json()
    w = data["windows"][0]
    required = {"hourStartLocal", "renewablePct", "estimatedPricePerKwh", "confidence", "isEstimate"}
    assert required.issubset(w.keys()), f"Missing window fields: {required - w.keys()}"


def test_windows_confidence_range(client: TestClient) -> None:
    data = client.post("/estimate/windows", json=PAYLOAD).json()
    for w in data["windows"]:
        assert 0 <= w["confidence"] <= 1


def test_windows_best_window_present(client: TestClient) -> None:
    data = client.post("/estimate/windows", json=PAYLOAD).json()
    bw = data["bestWindow"]
    assert "hourStartLocal" in bw
    assert "renewablePct" in bw
