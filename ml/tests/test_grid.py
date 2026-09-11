"""tests/test_grid.py — GET /grid/live and GET /grid/forecast"""
from fastapi.testclient import TestClient


def test_grid_live_200(client: TestClient) -> None:
    r = client.get("/grid/live", params={"zoneId": "IN-WE"})
    assert r.status_code == 200


def test_grid_live_schema(client: TestClient) -> None:
    data = client.get("/grid/live", params={"zoneId": "IN-WE"}).json()
    required = {"zoneId", "at", "renewablePct", "carbonFreePct", "carbonIntensity", "band", "breakdown", "quality", "asOfAgeSec"}
    assert required.issubset(data.keys()), f"Missing fields: {required - data.keys()}"


def test_grid_live_renewable_range(client: TestClient) -> None:
    data = client.get("/grid/live", params={"zoneId": "IN-WE"}).json()
    assert 0 <= data["renewablePct"] <= 100
    assert 0 <= data["carbonFreePct"] <= 100


def test_grid_live_quality_valid(client: TestClient) -> None:
    data = client.get("/grid/live", params={"zoneId": "IN-WE"}).json()
    assert data["quality"] in ("live", "cached", "forecast", "mock", "stale")


def test_grid_live_band_valid(client: TestClient) -> None:
    data = client.get("/grid/live", params={"zoneId": "IN-WE"}).json()
    assert data["band"] in ("very_high", "high", "medium", "low", "very_low")


def test_grid_forecast_200(client: TestClient) -> None:
    r = client.get("/grid/forecast", params={"zoneId": "IN-WE"})
    assert r.status_code == 200


def test_grid_forecast_returns_list(client: TestClient) -> None:
    data = client.get("/grid/forecast", params={"zoneId": "IN-WE"}).json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_grid_forecast_point_schema(client: TestClient) -> None:
    data = client.get("/grid/forecast", params={"zoneId": "IN-WE"}).json()
    pt = data[0]
    assert "hourStartLocal" in pt
    assert "renewablePct" in pt
    assert "carbonIntensity" in pt
    assert "confidence" in pt


def test_grid_forecast_confidence_range(client: TestClient) -> None:
    data = client.get("/grid/forecast", params={"zoneId": "IN-WE"}).json()
    for pt in data:
        assert 0 <= pt["confidence"] <= 1, f"confidence out of range: {pt['confidence']}"


def test_grid_forecast_hours_param(client: TestClient) -> None:
    data = client.get("/grid/forecast", params={"zoneId": "IN-WE", "hours": 3}).json()
    assert len(data) <= 3
