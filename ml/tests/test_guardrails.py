"""tests/test_guardrails.py — Tests for M3-C11"""
import pytest
from app.models import StationRecommendation, RecommendedWindow
from app.guardrails import validate_recommendations, GuardrailViolation

def test_guardrails_catches_bad_ranking():
    recs = [
        StationRecommendation(
            stationId="s1", distanceKm=10, travelMinutes=15, energyNeededKwh=20,
            chargingCost=100, travelCost=20, trueTotalCost=120, vsCheapestSticker=0,
            reachable=False, connectorCompatible=True, reason="Warning: You may not have enough battery to reach this station."
        ),
        StationRecommendation(
            stationId="s2", distanceKm=5, travelMinutes=10, energyNeededKwh=20,
            chargingCost=150, travelCost=10, trueTotalCost=160, vsCheapestSticker=-40,
            reachable=True, connectorCompatible=True, reason="Costs ₹40.0 more overall than the cheapest sticker price due to travel distance."
        )
    ]
    # s1 is unreachable but is ranked BEFORE s2 (which is valid). This should fail loudly.
    with pytest.raises(GuardrailViolation, match="ranked below an unreachable"):
        validate_recommendations(recs)

def test_guardrails_catches_bad_confidence():
    recs = [
        StationRecommendation.model_construct(
            stationId="s1", distanceKm=10, travelMinutes=15, energyNeededKwh=20,
            chargingCost=100, travelCost=20, trueTotalCost=120, vsCheapestSticker=0,
            reachable=True, connectorCompatible=True, reason="This has the cheapest sticker price and is the best overall value.",
            recommendedWindow=RecommendedWindow.model_construct(startLocal="2026", endLocal="2026", renewablePct=50, confidence=1.5) # Invalid confidence
        )
    ]
    with pytest.raises(GuardrailViolation, match="Confidence out of bounds"):
        validate_recommendations(recs)

def test_guardrails_catches_missing_reason():
    recs = [
        StationRecommendation(
            stationId="s1", distanceKm=10, travelMinutes=15, energyNeededKwh=20,
            chargingCost=100, travelCost=20, trueTotalCost=120, vsCheapestSticker=50, # Saves money
            reachable=True, connectorCompatible=True, reason="Great station!" # Missing explanation of distance benefit
        )
    ]
    with pytest.raises(GuardrailViolation, match="saves money but reason does not explain"):
        validate_recommendations(recs)
