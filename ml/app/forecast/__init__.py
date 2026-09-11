"""
app/forecast/__init__.py
────────────────────────
Forecasting module API.
"""
from __future__ import annotations

from app.forecast.data import load_history
from app.forecast.features import build_features, convert_to_ist, train_test_split_temporal
from app.forecast.model import get_forecaster, backtest_baseline, Forecaster

__all__ = [
    "load_history",
    "build_features",
    "convert_to_ist",
    "train_test_split_temporal",
    "get_forecaster",
    "backtest_baseline",
    "Forecaster",
]
