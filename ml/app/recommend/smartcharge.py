"""
app/recommend/smartcharge.py
────────────────────────────
Smart-charge optimizer logic.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.models import SmartChargePlanRequest, SmartChargePlan
from app.forecast import get_forecaster

def parse_ist(iso_str: str) -> datetime:
    """Naive parsing assuming the string is +05:30."""
    try:
        return datetime.fromisoformat(iso_str)
    except ValueError:
        dt = datetime.fromisoformat(iso_str.replace("Z", ""))
        return dt.replace(tzinfo=timezone(timedelta(hours=5, minutes=30)))

def format_ist(dt: datetime) -> str:
    return dt.isoformat()

def now_ist() -> datetime:
    tz = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(tz)

def plan(req: SmartChargePlanRequest) -> SmartChargePlan:
    """
    Finds the optimal charging start window that maximises renewable % 
    while meeting the user's deadline.
    """
    now = now_ist()
    deadline = parse_ist(req.deadlineLocal)
    
    if req.chargeRateKw <= 0:
        duration_hours = 0.0
    else:
        duration_hours = req.energyNeededKwh / req.chargeRateKw
        
    duration_td = timedelta(hours=duration_hours)
    
    # 1. Urgent Override
    if req.urgent:
        return SmartChargePlan(
            startLocal=format_ist(now),
            endLocal=format_ist(now + duration_td),
            expectedRenewablePct=0.0,
            expectedSavings=0.0,
            confidence=1.0,
            isImmediate=True,
            note="Urgent mode: charging started immediately."
        )
        
    # 2. Infeasible Deadline Fallback
    if now + duration_td > deadline:
        return SmartChargePlan(
            startLocal=format_ist(now),
            endLocal=format_ist(now + duration_td),
            expectedRenewablePct=0.0,
            expectedSavings=0.0,
            confidence=1.0,
            isImmediate=True,
            note=f"Cannot complete full {duration_hours:.1f}h charge by deadline; started immediately to maximize range."
        )

    # 3. Forecast Fetch
    forecaster = get_forecaster(req.zoneId)
    # Grab enough forecast to cover up to the deadline (at least 24h)
    hours_to_forecast = max(24, int((deadline - now).total_seconds() / 3600) + 1)
    forecasts = forecaster.predict(req.zoneId, hours=hours_to_forecast)
    
    if not forecasts:
        return SmartChargePlan(
            startLocal=format_ist(now),
            endLocal=format_ist(now + duration_td),
            expectedRenewablePct=0.0,
            expectedSavings=0.0,
            confidence=1.0,
            isImmediate=True,
            note="Grid forecast unavailable; charging started immediately."
        )

    # Helper to map a datetime to its forecasted renewable pct
    def get_ren_pct_for_time(t: datetime) -> tuple[float, float]:
        for fc in forecasts:
            fc_dt = parse_ist(fc.hourStartLocal)
            if fc_dt.date() == t.date() and fc_dt.hour == t.hour:
                return fc.renewablePct, fc.confidence
        return 0.0, 0.5
        
    now_ren_pct, _ = get_ren_pct_for_time(now + (duration_td / 2))

    # 4. Search for the optimal window
    best_start = now
    best_ren_pct = -1.0
    best_confidence = 0.0
    
    max_start = deadline - duration_td
    current_start = now
    
    # Step every 30 minutes
    while current_start <= max_start:
        midpoint = current_start + (duration_td / 2)
        ren_pct, conf = get_ren_pct_for_time(midpoint)
            
        if ren_pct > best_ren_pct:
            best_ren_pct = ren_pct
            best_start = current_start
            best_confidence = conf
            
        current_start += timedelta(minutes=30)
        
    is_immediate = best_start <= now + timedelta(minutes=15)
    
    # 5. Simulated Savings (e.g. ₹2/kWh saved by shifting off-peak)
    savings = 0.0
    if best_ren_pct >= now_ren_pct + 10.0 and not is_immediate:
        savings = 2.0 * req.energyNeededKwh
        
    if is_immediate:
        note = "Charging now is already optimal."
    else:
        note = f"Optimal window found! Expected renewable mix is {best_ren_pct:.1f}%."
        
    return SmartChargePlan(
        startLocal=format_ist(best_start),
        endLocal=format_ist(best_start + duration_td),
        expectedRenewablePct=best_ren_pct,
        expectedSavings=savings,
        confidence=best_confidence,
        isImmediate=is_immediate,
        note=note
    )
