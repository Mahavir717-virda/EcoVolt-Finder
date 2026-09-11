"""
tests/conftest.py
─────────────────
Shared pytest fixtures for the ecoVolt-finder ML service.

Uses httpx.AsyncClient with ASGITransport for async endpoint testing.
GRID_MODE is forced to "mock" so tests never call external APIs.
"""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

# Force mock mode for all tests — never call external APIs
os.environ.setdefault("GRID_MODE", "mock")
os.environ.setdefault("ELECTRICITY_MAPS_TOKEN", "test-token")
os.environ.setdefault("GOOGLE_SERVER_KEY", "test-key")

# Import app AFTER setting env vars
from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Synchronous test client (for simple, non-async tests)."""
    return TestClient(app)


@pytest.fixture
async def async_client():
    """Async test client for async endpoint tests."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
