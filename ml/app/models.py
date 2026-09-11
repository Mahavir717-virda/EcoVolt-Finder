"""
app/models.py
─────────────
Pydantic v2 models mirroring /contracts/types.ts and /contracts/openapi.ml.yaml.

These are the canonical Python representations of the shared contract.
Routers return these models; tests validate against them.

Key domain rules encoded here:
  • renewablePct ≠ carbonFreePct  (nuclear is carbon-free but NOT renewable)
  • 'unknown' in breakdown is excluded from the numerator — never silently guessed
  • quality tag is always present on every GridSnapshot
  • All timestamps stored/returned UTC; IST conversion is a display concern
  • confidence ∈ [0, 1]
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


# ─── Enums (mirroring /contracts/enums.ts) ───────────────────────────────────

GreennessBand = Literal["very_high", "high", "medium", "low", "very_low"]
DataQuality = Literal["live", "cached", "forecast", "mock", "stale"]


# ─── Primitives ──────────────────────────────────────────────────────────────

class GeoPoint(BaseModel):
    lat: float
    lng: float


# ─── Health ──────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    gridMode: str
    version: str


# ─── Grid / Greenness ─────────────────────────────────────────────────────────

class GridSnapshot(BaseModel):
    """
    A single snapshot of grid greenness for a zone.
    Returned by GET /grid/live.

    renewablePct ≠ carbonFreePct: nuclear is carbon-free but NOT renewable.
    'unknown' in breakdown is excluded from the numerator — never guessed.
    """
    zoneId:          str
    at:              str  # ISO 8601 UTC
    renewablePct:    float = Field(ge=0, le=100)
    carbonFreePct:   float = Field(ge=0, le=100)
    carbonIntensity: float = Field(description="gCO2eq/kWh")
    band:            GreennessBand
    breakdown:       dict[str, float]
    quality:         DataQuality
    asOfAgeSec:      int


# ─── Forecast ─────────────────────────────────────────────────────────────────

class ForecastPoint(BaseModel):
    """
    A single point in a 24-hour renewable forecast.
    confidence ∈ [0, 1] — low-confidence points are greyed in the UI.
    hourStartLocal is IST ISO-8601.
    """
    hourStartLocal:  str
    renewablePct:    float
    carbonIntensity: float
    confidence:      float = Field(ge=0, le=1)


# ─── Classification ───────────────────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    breakdown: dict[str, float] = Field(
        description=(
            "Keys: solar, wind, hydro, nuclear, coal, gas, oil, biomass, "
            "geothermal, unknown. Values: MW or proportional (normalised internally)."
        )
    )


class ClassifyResponse(BaseModel):
    renewablePct:    float = Field(description="0–100, solar+wind+hydro+biomass+geo")
    carbonFreePct:   float = Field(description="0–100, renewable + nuclear")
    band:            GreennessBand
    unclassifiedPct: float = Field(description="% of generation in 'unknown/other' — flagged, never guessed")


# ─── Pricing / Windows ────────────────────────────────────────────────────────

class WindowEstimate(BaseModel):
    hourStartLocal:       str
    renewablePct:         float
    estimatedPricePerKwh: float
    confidence:           float = Field(ge=0, le=1)
    isEstimate:           bool


class WindowsRequest(BaseModel):
    zoneId:    str
    tariff:    float = Field(description="Base ₹/kWh for the ToU calculation")
    hours:     int = 24
    durationH: float | None = Field(default=None, description="Charge duration hours — used to compute best_window")


class WindowsResponse(BaseModel):
    windows:    list[WindowEstimate]
    bestWindow: WindowEstimate


# ─── Routing ──────────────────────────────────────────────────────────────────

class RouteMatrixRequest(BaseModel):
    origin:        GeoPoint
    stationCoords: list[GeoPoint] = Field(max_length=25)


class RouteResult(BaseModel):
    distanceKm:    float
    travelMinutes: float
    isEstimated:   bool = Field(description="true when haversine fallback was used")


class RouteMatrixResponse(BaseModel):
    results: list[RouteResult]


# ─── Recommendation ───────────────────────────────────────────────────────────

class VehicleInput(BaseModel):
    vehicleClass:     Literal["car", "bike"]
    batteryKwh:       float
    efficiencyWhKm:   float
    connectors:       list[str]
    currentChargePct: float = Field(ge=0, le=100)


class CandidateStation(BaseModel):
    id:               str
    location:         GeoPoint
    connectors:       list[str]
    finalPricePerKwh: float
    provider:         str


class RecommendRequest(BaseModel):
    origin:            GeoPoint
    vehicle:           VehicleInput
    kwh:               float = Field(description="Energy needed for this session")
    candidateStations: list[CandidateStation] = Field(
        description="Pre-filtered to nearest K — not the whole network"
    )


class RecommendedWindow(BaseModel):
    startLocal:   str
    endLocal:     str
    renewablePct: float
    confidence:   float = Field(ge=0, le=1)


class StationRecommendation(BaseModel):
    """
    The ML service's output for a single candidate station.

    THE KEY EDGE CASE: ranking is on trueTotalCost, not sticker ₹/kWh.
    A station that looks cheaper per-kWh but is farther away may rank lower
    once travelCost is added. vsCheapestSticker exposes this trap to the user.

    reachable = false stations are shown greyed / excluded from ranking.
    connectorCompatible = false stations are hidden by default.
    """
    stationId:           str
    distanceKm:          float
    travelMinutes:       float
    energyNeededKwh:     float
    chargingCost:        float = Field(description="₹ = finalPrice × energyNeededKwh")
    travelCost:          float = Field(description="₹ — from vehicle travel-cost model")
    trueTotalCost:       float = Field(description="chargingCost + travelCost — the ranking key")
    vsCheapestSticker:   float = Field(description="₹ saved (positive) or lost (negative) vs naive cheapest/kWh pick")
    reachable:           bool
    connectorCompatible: bool
    recommendedWindow:   RecommendedWindow | None = None
    reason:              str


# ─── Smart-Charge ─────────────────────────────────────────────────────────────

class SmartChargePlanRequest(BaseModel):
    zoneId:          str
    stationId:       str
    chargeRateKw:    float
    energyNeededKwh: float
    deadlineLocal:   str = Field(description="IST ISO-8601 — must be done by this time")
    urgent:          bool = False
    tariff:          float | None = None


class SmartChargePlan(BaseModel):
    startLocal:           str = Field(description="IST ISO-8601")
    endLocal:             str
    expectedRenewablePct: float
    expectedSavings:      float = Field(description="₹ saved vs charging now")
    confidence:           float = Field(ge=0, le=1)
    isImmediate:          bool  = Field(description="true when urgent flag was set or no better window found")
    note:                 str | None = None
