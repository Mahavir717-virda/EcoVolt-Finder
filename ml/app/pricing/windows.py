"""
app/pricing/windows.py
───────────────────────
Time-of-use (ToU) + greenness cost estimator module.
"""
from __future__ import annotations

import math

from app.models import WindowEstimate, WindowsResponse
from app.forecast import get_forecaster


def get_tou_adjustment(renewable_pct: float) -> float:
    """
    Proxy formula for ToU adjustment based on renewable %.
    Identical in spirit to Member 2's pricing engine.
    - Base renewable% = 50%
    - Adjustment factor = 0.05 ₹/kWh per 1% deviation.
    """
    return (50.0 - renewable_pct) * 0.05


def best_window(estimates: list[WindowEstimate], duration_h: float | None) -> WindowEstimate:
    """
    Selects the greenest affordable window block for the given duration.
    Returns a WindowEstimate representing the start of the block, with aggregated metrics.
    """
    if not estimates:
        raise ValueError("Cannot compute best_window from empty estimates.")

    if duration_h is None or duration_h <= 1.0:
        return min(estimates, key=lambda w: (w.estimatedPricePerKwh, -w.renewablePct))

    blocks_needed = max(1, math.ceil(duration_h))
    if blocks_needed > len(estimates):
        blocks_needed = len(estimates)

    best_score = float('inf')
    best_estimate = estimates[0]

    for i in range(len(estimates) - blocks_needed + 1):
        block = estimates[i:i + blocks_needed]
        avg_price = sum(w.estimatedPricePerKwh for w in block) / blocks_needed
        avg_renewable = sum(w.renewablePct for w in block) / blocks_needed
        avg_confidence = sum(w.confidence for w in block) / blocks_needed

        # Minimise price; use negative renewable% as tie-breaker
        score = avg_price - (avg_renewable * 0.0001)

        if score < best_score:
            best_score = score
            best_estimate = WindowEstimate(
                hourStartLocal=block[0].hourStartLocal,
                renewablePct=avg_renewable,
                estimatedPricePerKwh=avg_price,
                confidence=avg_confidence,
                isEstimate=block[0].isEstimate
            )

    return best_estimate


def estimate_windows(zone_id: str, tariff: float, hours: int = 24, duration_h: float | None = None) -> WindowsResponse:
    """
    Computes per-hour charging windows combining:
      • Base tariff (₹/kWh) provided by the client
      • ToU adjustment (negative = green discount)
      • Renewable % forecast
    """
    forecaster = get_forecaster(zone_id)
    forecast_points = forecaster.predict(zone_id, hours)
    
    windows = []
    for fp in forecast_points:
        adjustment = get_tou_adjustment(fp.renewablePct)
        # Clamp to a floor of 50% of tariff
        estimated_price = max(tariff * 0.5, tariff + adjustment)
        
        windows.append(WindowEstimate(
            hourStartLocal=fp.hourStartLocal,
            renewablePct=fp.renewablePct,
            estimatedPricePerKwh=estimated_price,
            confidence=fp.confidence,
            isEstimate=True  # Transparent modeled proxy
        ))
        
    best_win = best_window(windows, duration_h) if windows else None
    
    return WindowsResponse(windows=windows, bestWindow=best_win)
