"""
app/ingestion/india_atlas.py
─────────────────────────────
India Energy Atlas / Grid-India source.

STATUS: STUB — No public REST API found (2026).

Grid-India (the national transmission company) does not currently offer a public
REST API with real-time fuel-mix data accessible without an enterprise agreement.
The India Energy Atlas portal (https://cea.nic.in/) provides downloadable CSVs
and monthly PDF reports, not a live JSON endpoint.

Confirmed unavailability:
  • Grid-India SCADA: internal only, no public token programme
  • CEA (Central Electricity Authority): reports at daily/monthly granularity only
  • POSOCO real-time dashboards: web-scraped HTML, no official API

This stub raises IngestionError unconditionally, causing the resolver to fall
through to the next source in the chain (cache → mock).

When a real endpoint becomes available, implement:
  GET https://grid-india.in/api/v1/state-wise-generation?date=<YYYY-MM-DD>
  Headers: X-Api-Key: <INDIA_ATLAS_KEY>

This source is positioned AFTER ElectricityMaps in the resolver's source list
so it can be promoted to primary in a future chunk without router changes.
"""
from __future__ import annotations

from app.ingestion.base import GridSource, IngestionError
from app.models import GridSnapshot


class IndiaAtlasClient:
    """
    Stub for the India Energy Atlas / Grid-India API.
    Always raises IngestionError until a public API is available.
    """

    name = "india_atlas"

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    async def fetch(self, zone_id: str) -> GridSnapshot:
        raise IngestionError(
            self.name,
            (
                "No public real-time API available from Grid-India / CEA as of 2026. "
                "Falling through to next source in resolver chain."
            ),
        )
