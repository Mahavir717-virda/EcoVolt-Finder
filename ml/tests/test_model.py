"""
tests/test_model.py
───────────────────
Tests for M3-C5 forecast model.
"""
from fastapi.testclient import TestClient
from app.forecast.model import backtest_baseline, get_forecaster
from pathlib import Path

def test_backtest_baseline():
    """Ensure the backtest runs and generates metrics."""
    metrics = backtest_baseline()
    
    assert "Baseline MAE" in metrics
    assert "Naive MAE" in metrics
    assert metrics["Baseline MAE"] <= metrics["Naive MAE"]
    
    # Check that metrics file was written
    metrics_path = Path(__file__).parent.parent.parent / "docs" / "notes" / "M3-C5-metrics.md"
    assert metrics_path.exists()
    
def test_predict_endpoint(client: TestClient):
    """Ensure GET /grid/forecast returns 24 IST-hour points with confidence."""
    # First, make sure model is built
    get_forecaster("IN-TEST")
    
    r = client.get("/grid/forecast", params={"zoneId": "IN-TEST", "hours": 24})
    assert r.status_code == 200
    data = r.json()
    
    assert len(data) == 24
    for pt in data:
        assert "renewablePct" in pt
        assert "carbonIntensity" in pt
        assert "confidence" in pt
        assert "hourStartLocal" in pt
        assert 0.0 <= pt["confidence"] <= 1.0
        assert 0.0 <= pt["renewablePct"] <= 100.0
