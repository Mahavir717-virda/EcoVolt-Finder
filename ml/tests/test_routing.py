"""tests/test_routing.py — POST /route/matrix"""
import pytest
from fastapi.testclient import TestClient
from app.routing.google import route, geocode
from app.models import GeoPoint

PAYLOAD = {
    "origin": {"lat": 23.0225, "lng": 72.5714},
    "stationCoords": [
        {"lat": 23.0300, "lng": 72.5800},
        {"lat": 23.0150, "lng": 72.5600},
    ],
}


def test_route_matrix_200(client: TestClient) -> None:
    r = client.post("/route/matrix", json=PAYLOAD)
    assert r.status_code == 200


def test_route_matrix_schema(client: TestClient) -> None:
    data = client.post("/route/matrix", json=PAYLOAD).json()
    assert "results" in data
    assert isinstance(data["results"], list)


def test_route_matrix_result_fields(client: TestClient) -> None:
    data = client.post("/route/matrix", json=PAYLOAD).json()
    r = data["results"][0]
    required = {"distanceKm", "travelMinutes", "isEstimated"}
    assert required.issubset(r.keys()), f"Missing result fields: {required - r.keys()}"


def test_route_matrix_non_negative(client: TestClient) -> None:
    data = client.post("/route/matrix", json=PAYLOAD).json()
    for r in data["results"]:
        assert r["distanceKm"] >= 0
        assert r["travelMinutes"] >= 0

@pytest.mark.asyncio
async def test_route_fallback():
    origin = GeoPoint(lat=23.0, lng=72.0)
    dest = GeoPoint(lat=23.1, lng=72.1)
    # Pass None for api_key to force fallback
    res = await route(origin, dest, None)
    
    assert res["isEstimated"] is True
    assert res["distanceKm"] > 0
    assert res["travelMinutes"] > 0
    assert res["polyline"] == ""

@pytest.mark.asyncio
async def test_geocode_fallback():
    # Without api key it should gracefully return None
    res = await geocode("Ahmedabad", None)
    assert res is None
