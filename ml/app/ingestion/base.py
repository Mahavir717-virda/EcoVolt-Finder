"""
app/ingestion/base.py
─────────────────────
GridSource protocol + shared IngestionError exception.

All ingestion sources implement GridSource. The resolver selects which
source to call — sources never know about each other.
"""
from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.models import GridSnapshot


class IngestionError(Exception):
    """Raised by any GridSource when it cannot produce a snapshot."""

    def __init__(self, source: str, msg: str, original: BaseException | None = None) -> None:
        super().__init__(f"[{source}] {msg}")
        self.source = source
        self.original = original


@runtime_checkable
class GridSource(Protocol):
    """
    Protocol every grid data source must satisfy.
    fetch() raises IngestionError on failure — never returns None.
    """

    @property
    def name(self) -> str: ...

    async def fetch(self, zone_id: str) -> GridSnapshot: ...
