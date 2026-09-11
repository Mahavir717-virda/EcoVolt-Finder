"""
app/recommend/engine.py
───────────────────────
The recommendation and ranking engine.
"""
from typing import List

from app.models import RecommendRequest, StationRecommendation
from app.recommend.travel import travel_cost, is_reachable
from app.routing.google import route_matrix
from app.config import get_settings

# A minor penalty for taking longer to drive there (₹2 per minute)
TIME_PENALTY_INR_PER_MIN = 2.0

async def recommend(req: RecommendRequest) -> List[StationRecommendation]:
    """
    Ranks candidate stations by true total cost (charging + travel).
    Exposes the 'sticker trap' by comparing against the naive cheapest-₹/kWh pick.
    """
    if not req.candidateStations:
        return []
        
    settings = get_settings()
    station_coords = [s.location for s in req.candidateStations]
    
    # 1. Get accurate routing to all candidates
    matrix = await route_matrix(req.origin, station_coords, settings.google_server_key)
    
    recs = []
    
    # Find the absolute cheapest sticker price (naive pick)
    cheapest_sticker = min(s.finalPricePerKwh for s in req.candidateStations)
    
    # Process costs and filters
    for i, station in enumerate(req.candidateStations):
        route_res = matrix.results[i]
        
        # Filters
        connector_compatible = any(c in req.vehicle.connectors for c in station.connectors)
        reachable = is_reachable(route_res.distanceKm, req.vehicle)
        
        # Costs
        charging_cost = station.finalPricePerKwh * req.kwh
        t_cost = travel_cost(route_res.distanceKm, req.vehicle)
        true_total_cost = charging_cost + t_cost
        
        # Time penalty for sorting
        sort_score = true_total_cost + (route_res.travelMinutes * TIME_PENALTY_INR_PER_MIN)
        
        recs.append({
            "station": station,
            "route_res": route_res,
            "connector_compatible": connector_compatible,
            "reachable": reachable,
            "charging_cost": charging_cost,
            "travel_cost": t_cost,
            "true_total_cost": true_total_cost,
            "sort_score": sort_score
        })
        
    # Find the true total cost of the naive pick (the cheapest sticker station)
    cheapest_sticker_recs = [r for r in recs if r["station"].finalPricePerKwh == cheapest_sticker]
    naive_pick_cost = min(r["true_total_cost"] for r in cheapest_sticker_recs)
    
    # Sort recs: Incompatible/Unreachable go to the bottom, then sort by score
    recs.sort(key=lambda r: (
        not r["connector_compatible"], 
        not r["reachable"], 
        r["sort_score"]
    ))

    final_recs = []
    for r in recs:
        # vsCheapestSticker: positive = saved money vs naive pick
        vs_cheapest = naive_pick_cost - r["true_total_cost"]
        
        # Generate sensible reasons
        reason = "A balanced choice of price and distance."
        if not r["connector_compatible"]:
            reason = "Warning: This station does not support your vehicle's connector type."
        elif not r["reachable"]:
            reason = "Warning: You may not have enough battery to reach this station."
        elif r["true_total_cost"] < naive_pick_cost - 0.1:  # Saved more than a few paisa
            reason = f"Costs ₹{abs(vs_cheapest):.1f} less overall than the cheapest sticker price because it's much closer!"
        elif r["true_total_cost"] > naive_pick_cost + 0.1:
            reason = f"Costs ₹{abs(vs_cheapest):.1f} more overall than the cheapest sticker price due to travel distance."
        elif r["station"].finalPricePerKwh == cheapest_sticker:
            reason = "This has the cheapest sticker price and is the best overall value."
            
        final_recs.append(StationRecommendation(
            stationId=r["station"].id,
            distanceKm=r["route_res"].distanceKm,
            travelMinutes=r["route_res"].travelMinutes,
            energyNeededKwh=req.kwh,
            chargingCost=r["charging_cost"],
            travelCost=r["travel_cost"],
            trueTotalCost=r["true_total_cost"],
            vsCheapestSticker=vs_cheapest,
            reachable=r["reachable"],
            connectorCompatible=r["connector_compatible"],
            recommendedWindow=None,  # Could be populated by smartcharge later
            reason=reason
        ))
        
    return final_recs
