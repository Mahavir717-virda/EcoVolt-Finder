"""tests/test_health.py"""
from fastapi.testclient import TestClient


def test_health_200(client: TestClient) -> None:
    r = client.get("/health")
    assert r.status_code == 200


def test_health_status_field(client: TestClient) -> None:
    data = client.get("/health").json()
    assert data["status"] == "ok"


def test_health_grid_mode_field(client: TestClient) -> None:
    data = client.get("/health").json()
    assert data["gridMode"] in ("live", "mock", "hybrid")


def test_health_version_field(client: TestClient) -> None:
    data = client.get("/health").json()
    assert "version" in data
    assert data["version"]  # non-empty
