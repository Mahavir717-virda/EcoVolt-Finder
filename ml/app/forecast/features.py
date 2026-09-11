"""
app/forecast/features.py
────────────────────────
Feature builders for forecasting.
"""
import pandas as pd

def convert_to_ist(timestamps: pd.DatetimeIndex) -> pd.DatetimeIndex:
    """Centralized UTC to IST conversion."""
    if timestamps.tz is None:
        raise ValueError("Timestamps must be timezone-aware (UTC).")
    return timestamps.tz_convert("Asia/Kolkata")

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Builds the feature frame from a historical dataframe.
    Input df must have a UTC DatetimeIndex and 'renewable_pct' column.
    """
    if df.index.tz is None:
        raise ValueError("DataFrame index must be timezone-aware (UTC).")
        
    df = df.copy()
    
    # 1. Time-based features using IST
    ist_index = convert_to_ist(df.index)
    df["hour_of_day"] = ist_index.hour
    df["day_of_week"] = ist_index.dayofweek
    df["month"] = ist_index.month
    
    # 2. Lag features
    df["lag_1h"] = df["renewable_pct"].shift(1)
    df["lag_2h"] = df["renewable_pct"].shift(2)
    df["lag_24h"] = df["renewable_pct"].shift(24)
    
    # 3. Rolling means (shifted by 1 so we don't leak the current hour's target)
    df["rolling_3h_mean"] = df["renewable_pct"].shift(1).rolling(window=3).mean()
    df["rolling_6h_mean"] = df["renewable_pct"].shift(1).rolling(window=6).mean()
    df["rolling_24h_mean"] = df["renewable_pct"].shift(1).rolling(window=24).mean()
    
    # Drop NaNs caused by lagging
    df = df.dropna()
    
    return df

def train_test_split_temporal(df: pd.DataFrame, test_days: int = 2) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Splits data strictly temporally to avoid data leakage."""
    if len(df) == 0:
        return df, df
        
    cutoff = df.index.max() - pd.Timedelta(days=test_days)
    train = df[df.index <= cutoff]
    test = df[df.index > cutoff]
    return train, test
