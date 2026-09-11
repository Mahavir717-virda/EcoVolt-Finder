"""
app/recommend/__init__.py
─────────────────────────
STUB — Travel-cost model + net-benefit ranking + smart-charge optimizer.

Core ranking logic:
  trueTotalCost = chargingCost + travelCost

  NOT sticker ₹/kWh — a station that looks cheaper per-kWh but is farther
  may rank lower once travelCost is added.
  vsCheapestSticker exposes this trap to the user (positive = better deal).

Travel cost model:
  car:  ₹/km based on efficiency and fuel cost
  bike: ₹/km based on 2-wheeler efficiency model

Smart-charge optimizer (M3-C10):
  Finds optimal charging window that maximises renewable %
  while meeting the deadline. Returns SmartChargePlan.

Fully implemented in M3-C8, M3-C9, M3-C10.
"""
from __future__ import annotations

# M3-C8/C9/C10 will expose:
#   async def rank_stations(request: RecommendRequest, settings) -> list[StationRecommendation]
#   def travel_cost(distance_km: float, vehicle: VehicleInput) -> float
#   async def smart_charge_plan(request: SmartChargePlanRequest, settings) -> SmartChargePlan
