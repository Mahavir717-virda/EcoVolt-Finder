"""
tests/test_forecast.py
───────────────────────
Tests for M3-C4 forecast feature engineering.
"""
import pytest
import pandas as pd
from datetime import datetime, timezone

from app.forecast.data import load_history
from app.forecast.features import convert_to_ist, build_features, train_test_split_temporal

def test_convert_to_ist():
    """Test centralization of UTC -> IST logic."""
    # 12:00 UTC = 17:30 IST
    idx_utc = pd.DatetimeIndex([datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)])
    idx_ist = convert_to_ist(idx_utc)
    
    assert idx_ist.hour[0] == 17
    assert idx_ist.minute[0] == 30

def test_convert_to_ist_requires_tz():
    idx_naive = pd.DatetimeIndex(["2026-01-01 12:00:00"])
    with pytest.raises(ValueError, match="timezone-aware"):
        convert_to_ist(idx_naive)

def test_build_features():
    """Test feature builders on a synthetic dataframe."""
    idx = pd.date_range("2026-01-01", periods=48, freq="1h", tz="UTC")
    df = pd.DataFrame({"renewable_pct": range(48)}, index=idx)
    
    feat_df = build_features(df)
    
    # 24 rows dropped due to lag_24h
    assert len(feat_df) == 48 - 24
    
    # Check time features (first row in feat_df is 2026-01-02 00:00:00 UTC = 05:30 IST)
    assert "hour_of_day" in feat_df.columns
    assert feat_df["hour_of_day"].iloc[0] == 5 # 00:00 UTC -> 05:30 IST
    
    # Check lag features
    assert feat_df["lag_1h"].iloc[0] == 23 # The value of row 23 (index 23, value 23)
    assert feat_df["lag_24h"].iloc[0] == 0 # The value of row 0
    
    # Check rolling mean 3h (for row 24, previous 3 were 21, 22, 23, mean = 22)
    assert feat_df["rolling_3h_mean"].iloc[0] == 22.0

def test_train_test_split_no_leakage():
    idx = pd.date_range("2026-01-01", periods=10, freq="1d", tz="UTC")
    df = pd.DataFrame({"val": range(10)}, index=idx)
    
    train, test = train_test_split_temporal(df, test_days=2)
    
    # The last timestamp is 2026-01-10. Cutoff is 2026-01-10 - 2 days = 2026-01-08
    # train gets <= 2026-01-08 (8 days). test gets > 2026-01-08 (2 days)
    assert len(train) == 8
    assert len(test) == 2
    
    assert train.index.max() < test.index.min()

def test_load_history():
    """Ensure data loading creates the demo history frame."""
    df = load_history("IN-TEST")
    assert len(df) > 0
    assert "renewable_pct" in df.columns
    assert "carbon_intensity" in df.columns
    assert df.index.tz is not None
