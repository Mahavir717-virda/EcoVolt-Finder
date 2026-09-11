"""tests/test_classify.py — POST /classify"""
import math
from fastapi.testclient import TestClient
from app.classify.metrics import compute_metrics, band_from_pct

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


def test_classify_math(client: TestClient) -> None:
    """
    Test correct percentage logic.
    Known total = 4200 + 2800 + 1500 + 800 + 6000 + 1200 = 16500
    All total = 16800
    Renewable = 4200 + 2800 + 1500 = 8500 -> 8500 / 16500 = 51.515151...
    Carbon Free = 8500 + 800 = 9300 -> 9300 / 16500 = 56.363636...
    Unclassified = 300 -> 300 / 16800 = 1.7857...
    Band: 51.51 >= 50 -> "medium"
    """
    data = client.post("/classify", json=PAYLOAD).json()
    
    assert math.isclose(data["renewablePct"], 51.515151515151516)
    assert math.isclose(data["carbonFreePct"], 56.36363636363636)
    assert math.isclose(data["unclassifiedPct"], 1.7857142857142858)
    assert data["band"] == "medium"


def test_classify_unknown_heavy(client: TestClient) -> None:
    payload = {
        "breakdown": {
            "solar": 100,
            "unknown": 900,
        }
    }
    data = client.post("/classify", json=payload).json()
    # known total = 100, renewable = 100, all total = 1000
    assert math.isclose(data["renewablePct"], 100.0)
    assert math.isclose(data["unclassifiedPct"], 90.0)


def test_classify_nuclear_heavy(client: TestClient) -> None:
    payload = {
        "breakdown": {
            "nuclear": 1000,
            "solar": 0,
            "coal": 0,
        }
    }
    data = client.post("/classify", json=payload).json()
    assert data["renewablePct"] == 0.0
    assert data["carbonFreePct"] == 100.0
