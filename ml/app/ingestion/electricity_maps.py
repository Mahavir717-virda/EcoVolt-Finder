"""
app/ingestion/electricity_maps.py
──────────────────────────────────
Electricity Maps API client.

Docs:  https://api.electricitymap.org/v3/docs
Auth:  auth-token: <ELECTRICITY_MAPS_TOKEN>  (request header)
Endpoint used:
  GET /power-breakdown/latest?zone=<zone>
  GET /carbon-intensity/latest?zone=<zone>   (fallback for intensity only)

Zone mapping (our zoneId → Electricity Maps zone):
  IN      → IN       (national average)
  IN-WE   → IN-WE    (Western: Gujarat, Maharashtra, Goa)
  IN-SO   → IN-SO    (Southern: TN, Karnataka, AP, Kerala)
  IN-NO   → IN-NO    (Northern: UP, Delhi, Haryana, Punjab)
  IN-EA   → IN-EA    (Eastern: WB, Odisha, Bihar, Jharkhand)
  IN-NE   → IN-NE    (North-Eastern: Assam etc.)
  <other> → IN       (fallback to national)

Retry: 2 attempts, exponential backoff 0.5 s → 1.0 s, 5 s timeout.
On any failure: raises IngestionError — the resolver decides what to do next.
"""
from __future__ import annotations

import asyncio
import math
from datetime import datetime, timezone

import httpx

from app.ingestion.base import GridSource, IngestionError
from app.classify import band_from_pct, compute_metrics, compute_carbon_intensity
from app.models import GridSnapshot

# ── Zone mapping ──────────────────────────────────────────────────────────────

_ZONE_MAP: dict[str, str] = {
    "IN":    "IN",
    "IN-WE": "IN-WE",
    "IN-SO": "IN-SO",
    "IN-NO": "IN-NO",
    "IN-EA": "IN-EA",
    "IN-NE": "IN-NE",
}
_FALLBACK_ZONE = "IN"

# Electricity Maps fuel keys → our internal keys
_KEY_MAP: dict[str, str] = {
    "solar":        "solar",
    "wind":         "wind",
    "hydro":        "hydro",
    "nuclear":      "nuclear",
    "coal":         "coal",
    "gas":          "gas",
    "oil":          "oil",
    "biomass":      "biomass",
    "geothermal":   "geothermal",
    "unknown":      "unknown",
    "hydro discharge":    "hydro",   # some zone variants
    "battery discharge":  "unknown",
}

_BASE_URL = "https://api.electricitymap.org/v3"
_TIMEOUT  = 5.0   # seconds
_RETRIES  = 2
_BACKOFF  = 0.5   # first retry delay (doubles each time)


class ElectricityMapsClient:
    """
    Fetches real-time power-breakdown data from the Electricity Maps API.
    Returns a GridSnapshot tagged quality='live'.
    Raises IngestionError on any failure.
    """

    name = "electricity_maps"

    def __init__(self, token: str) -> None:
        if not token:
            raise IngestionError(self.name, "ELECTRICITY_MAPS_TOKEN is not set")
        self._headers = {"auth-token": token}

    async def fetch(self, zone_id: str) -> GridSnapshot:
        em_zone = _ZONE_MAP.get(zone_id, _FALLBACK_ZONE)
        raw = await self._get_with_retry(
            f"{_BASE_URL}/power-breakdown/latest",
            params={"zone": em_zone},
        )
        return self._parse(zone_id, raw)

    # ── HTTP helpers ──────────────────────────────────────────────────────────

    async def _get_with_retry(self, url: str, params: dict) -> dict:
        last_exc: BaseException | None = None
        delay = _BACKOFF
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            for attempt in range(_RETRIES):
                try:
                    r = await client.get(url, params=params, headers=self._headers)
                    r.raise_for_status()
                    return r.json()
                except (httpx.HTTPError, httpx.TimeoutException) as exc:
                    last_exc = exc
                    if attempt < _RETRIES - 1:
                        await asyncio.sleep(delay)
                        delay *= 2
        raise IngestionError(self.name, f"HTTP error after {_RETRIES} attempts", last_exc)

    # ── Parsing ───────────────────────────────────────────────────────────────

    @staticmethod
    def _parse(zone_id: str, raw: dict) -> GridSnapshot:
        now_utc = datetime.now(timezone.utc)

        # Parse the reading timestamp
        dt_str: str = raw.get("datetime", now_utc.isoformat())
        try:
            reading_dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        except ValueError:
            reading_dt = now_utc
        as_of_age = max(0, int((now_utc - reading_dt.replace(tzinfo=timezone.utc)).total_seconds()))

        # Build breakdown (MW)
        power_prod: dict = raw.get("powerProductionBreakdown", {})
        breakdown: dict[str, float] = {}
        for em_key, mw in (power_prod or {}).items():
            our_key = _KEY_MAP.get(em_key.lower(), "unknown")
            breakdown[our_key] = breakdown.get(our_key, 0.0) + (mw or 0.0)

        # Carbon intensity — prefer the API value if positive, otherwise compute dynamically from live breakdown
        carbon_intensity: float = 0.0
        if "carbonIntensity" in raw and raw["carbonIntensity"]:
            try:
                carbon_intensity = float(raw["carbonIntensity"])
            except (ValueError, TypeError):
                carbon_intensity = 0.0
        elif raw.get("fossilFreePercentage") and raw.get("carbonIntensity"):
            try:
                carbon_intensity = float(raw["carbonIntensity"])
            except (ValueError, TypeError):
                carbon_intensity = 0.0

        if carbon_intensity <= 0:
            carbon_intensity = compute_carbon_intensity(breakdown)

        # Compute renewable/carbonFree percentages
        metrics = compute_metrics(breakdown)
        renewable_pct = metrics["renewablePct"]
        carbon_free_pct = metrics["carbonFreePct"]
        band = band_from_pct(renewable_pct)

        return GridSnapshot(
            zoneId=zone_id,
            at=now_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            renewablePct=round(renewable_pct, 2),
            carbonFreePct=round(carbon_free_pct, 2),
            carbonIntensity=round(carbon_intensity, 1),
            band=band,
            breakdown=breakdown,
            quality="live",
            asOfAgeSec=as_of_age,
        )
