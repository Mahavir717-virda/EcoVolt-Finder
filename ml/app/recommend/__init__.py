"""
app/recommend/__init__.py
─────────────────────────
Recommendation engine and travel cost logic.
"""
from __future__ import annotations
from app.recommend.travel import travel_cost, is_reachable, travel_energy_kwh
from app.recommend.engine import recommend
from app.recommend.smartcharge import plan as smartcharge_plan

__all__ = [
    "travel_cost",
    "is_reachable",
    "travel_energy_kwh",
    "recommend",
    "smartcharge_plan"
]
