"""
app/forecast/data.py
────────────────────
Historical storage for forecasting.
Loads data from a local CSV (or generates demo data if missing).
"""
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta, timezone

from app.ingestion.mock_generator import MockGenerator

DATA_DIR = Path(__file__).parent.parent.parent / "data"

def _generate_demo_history(zone_id: str, days: int = 14) -> pd.DataFrame:
    """Generates a realistic historical dataset for the demo using MockGenerator."""
    gen = MockGenerator(seed=42)
    end = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    start = end - timedelta(days=days)
    
    rows = []
    curr = start
    while curr <= end:
        snap = gen.generate(zone_id, at_utc=curr)
        rows.append({
            "timestamp_utc": curr,
            "renewable_pct": snap.renewablePct,
            "carbon_intensity": snap.carbonIntensity
        })
        curr += timedelta(hours=1)
        
    df = pd.DataFrame(rows)
    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True)
    df.set_index("timestamp_utc", inplace=True)
    return df

def load_history(zone_id: str = "IN") -> pd.DataFrame:
    """
    Loads history for a zone.
    If the CSV doesn't exist, it generates and commits it (for demo).
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    csv_path = DATA_DIR / f"{zone_id}_history.csv"
    
    if not csv_path.exists():
        df = _generate_demo_history(zone_id)
        df.to_csv(csv_path)
    else:
        df = pd.read_csv(csv_path, parse_dates=["timestamp_utc"])
        df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True)
        df.set_index("timestamp_utc", inplace=True)
        
    # Resample to hourly and interpolate missing to ensure a clean uniform grid
    # Resample explicitly uses 'h' for hour since 'H' is deprecated in modern pandas
    df = df.resample("1h").mean().interpolate(method="linear", limit=3)
    return df
