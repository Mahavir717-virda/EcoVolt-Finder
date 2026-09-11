"""
app/recommend/travel.py
───────────────────────
Core math for vehicle travel-cost and reachability.
"""
from app.models import VehicleInput

# Default safety factor: require 20% more range than strictly needed
DEFAULT_SAFETY_FACTOR = 1.2
# Default reference rate: typical home charging ₹/kWh if not provided
DEFAULT_REF_RATE_INR_KWH = 7.0

def travel_energy_kwh(distance_km: float, vehicle: VehicleInput) -> float:
    """Calculates the energy needed to travel a given distance."""
    if distance_km < 0:
        return 0.0
    return (distance_km * vehicle.efficiencyWhKm) / 1000.0

def travel_cost(distance_km: float, vehicle: VehicleInput, ref_rate: float = DEFAULT_REF_RATE_INR_KWH) -> float:
    """
    Calculates the monetary cost to travel a given distance.
    This is the core of the 'cheaper-but-farther loophole'.
    """
    energy = travel_energy_kwh(distance_km, vehicle)
    return energy * ref_rate

def is_reachable(distance_km: float, vehicle: VehicleInput, safety_factor: float = DEFAULT_SAFETY_FACTOR) -> bool:
    """
    Checks if the vehicle can reach the destination with its current charge.
    """
    if distance_km <= 0:
        return True
        
    current_capacity_kwh = (vehicle.currentChargePct / 100.0) * vehicle.batteryKwh
    
    # Avoid division by zero
    if vehicle.efficiencyWhKm <= 0:
        return False
        
    max_range_km = (current_capacity_kwh * 1000.0) / vehicle.efficiencyWhKm
    
    return max_range_km >= (distance_km * safety_factor)
