"""tests/test_travel.py"""
import pytest
from app.models import VehicleInput
from app.recommend.travel import travel_cost, is_reachable, travel_energy_kwh

def test_bike_vs_car_travel_cost():
    # 10km trip
    dist = 10.0
    ref_rate = 7.0
    
    bike = VehicleInput(vehicleClass="bike", batteryKwh=3.0, efficiencyWhKm=25.0, connectors=["Type 2"], currentChargePct=50.0)
    car = VehicleInput(vehicleClass="car", batteryKwh=50.0, efficiencyWhKm=150.0, connectors=["CCS2"], currentChargePct=50.0)
    
    # Bike energy: 10 * 25 / 1000 = 0.25 kWh -> * 7 = 1.75 INR
    bike_cost = travel_cost(dist, bike, ref_rate)
    assert bike_cost == 1.75
    
    # Car energy: 10 * 150 / 1000 = 1.5 kWh -> * 7 = 10.50 INR
    car_cost = travel_cost(dist, car, ref_rate)
    assert car_cost == 10.50
    
    # Car costs significantly more to travel the same distance
    assert car_cost > bike_cost * 5

def test_reachability_boundary():
    # Car with 50kWh battery at 10% = 5kWh available.
    # Efficiency 150 Wh/km -> max range = 5000 / 150 = 33.33 km
    car = VehicleInput(vehicleClass="car", batteryKwh=50.0, efficiencyWhKm=150.0, connectors=["CCS2"], currentChargePct=10.0)
    
    # Without safety factor
    assert is_reachable(33.0, car, safety_factor=1.0) is True
    assert is_reachable(34.0, car, safety_factor=1.0) is False
    
    # With safety factor 1.2x (requires 33.33 / 1.2 = 27.77 km max distance)
    assert is_reachable(27.0, car, safety_factor=1.2) is True
    assert is_reachable(28.0, car, safety_factor=1.2) is False

def test_travel_energy_negative_distance():
    bike = VehicleInput(vehicleClass="bike", batteryKwh=3.0, efficiencyWhKm=25.0, connectors=["Type 2"], currentChargePct=50.0)
    assert travel_energy_kwh(-5.0, bike) == 0.0
    
def test_is_reachable_negative_distance():
    bike = VehicleInput(vehicleClass="bike", batteryKwh=3.0, efficiencyWhKm=25.0, connectors=["Type 2"], currentChargePct=5.0)
    assert is_reachable(-5.0, bike) is True

def test_is_reachable_zero_efficiency():
    car = VehicleInput(vehicleClass="car", batteryKwh=50.0, efficiencyWhKm=0.0, connectors=["CCS2"], currentChargePct=10.0)
    assert is_reachable(10.0, car) is False
