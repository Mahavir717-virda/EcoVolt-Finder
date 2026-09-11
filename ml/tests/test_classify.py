"""tests/test_classify.py — POST /classify"""
from fastapi.testclient import TestClient

PAYLOAD = {
    "breakdown": {
        "solar": 4200,
        "wind": 2800,
        "hydro": 1500,
        "nuclear": 800,
        "coal": 6000,
        "gas": 1200,
        "unknown": 300,
    }
}


def test_classify_200(client: TestClient) -> None:
    r = client.post("/classify", json=PAYLOAD)
    assert r.status_code == 200


def test_classify_schema(client: TestClient) -> None:
    data = client.post("/classify", json=PAYLOAD).json()
    required = {"renewablePct", "carbonFreePct", "band", "unclassifiedPct"}
    assert required.issubset(data.keys()), f"Missing fields: {required - data.keys()}"


def test_classify_pct_range(client: TestClient) -> None:
    data = client.post("/classify", json=PAYLOAD).json()
    assert 0 <= data["renewablePct"] <= 100
    assert 0 <= data["carbonFreePct"] <= 100
    assert 0 <= data["unclassifiedPct"] <= 100


def test_classify_band_valid(client: TestClient) -> None:
    data = client.post("/classify", json=PAYLOAD).json()
    assert data["band"] in ("very_high", "high", "medium", "low", "very_low")
