"""
app/guardrails.py
─────────────────
Validation and runtime checks for ML service outputs.
Ensures we never emit dangerous, nonsensical, or unexplainable recommendations.
"""
from typing import List
from app.models import StationRecommendation, GridSnapshot, ForecastPoint

class GuardrailViolation(Exception):
    pass

def validate_recommendations(recs: List[StationRecommendation]) -> List[StationRecommendation]:
    """
    Validates a ranked list of recommendations.
    Raises GuardrailViolation if any rule is broken.
    Returns the list unchanged if valid.
    """
    found_invalid = False
    
    for i, rec in enumerate(recs):
        # 1. Never emit a confidence outside [0, 1]
        if rec.recommendedWindow and not (0.0 <= rec.recommendedWindow.confidence <= 1.0):
            raise GuardrailViolation(f"Confidence out of bounds for {rec.stationId}: {rec.recommendedWindow.confidence}")
            
        # 2. Never rank an unreachable/incompatible station before a valid one
        is_invalid = not rec.reachable or not rec.connectorCompatible
        if is_invalid:
            found_invalid = True
        elif found_invalid:
            # A valid station appears AFTER an invalid station. This means we ranked an invalid station!
            raise GuardrailViolation(f"Valid station {rec.stationId} ranked below an unreachable/incompatible one")

        # 3. Explainability: Reason must reference the actual deciding factor
        reason_lower = rec.reason.lower()
        if not rec.reachable and "battery" not in reason_lower and "reach" not in reason_lower:
            raise GuardrailViolation(f"Unreachable station {rec.stationId} missing explicit reason")
            
        if not rec.connectorCompatible and "connector" not in reason_lower and "support" not in reason_lower:
            raise GuardrailViolation(f"Incompatible station {rec.stationId} missing explicit reason")
            
        if rec.reachable and rec.connectorCompatible:
            if rec.vsCheapestSticker < -0.1 and "more overall" not in reason_lower and "distance" not in reason_lower:
                raise GuardrailViolation(f"Station {rec.stationId} costs more but reason does not explain distance penalty")
                
            if rec.vsCheapestSticker > 0.1 and "less overall" not in reason_lower and "closer" not in reason_lower:
                raise GuardrailViolation(f"Station {rec.stationId} saves money but reason does not explain distance benefit")

    return recs

def validate_forecast(points: List[ForecastPoint]) -> List[ForecastPoint]:
    for p in points:
        if not (0.0 <= p.confidence <= 1.0):
            raise GuardrailViolation(f"Forecast confidence out of bounds: {p.confidence}")
    return points

def validate_grid_snapshot(snap: GridSnapshot) -> GridSnapshot:
    # "never present a mock/low-confidence value without its tag"
    if not snap.quality:
        raise GuardrailViolation("Grid snapshot missing quality tag")
    
    # Check that breakdown doesn't contain negative values
    for fuel, mw in snap.breakdown.items():
        if mw < 0:
            raise GuardrailViolation(f"Negative generation for {fuel} in snapshot")
            
    return snap
