import sys
from pathlib import Path

# Add ml folder to python path
sys.path.append(str(Path(__file__).parent))

from fastapi.testclient import TestClient
from app.main import app
from app.forecast.model import backtest_baseline
from app.config import get_settings

def run_live_tests():
    print("==================================================")
    print("      ECOVOLT-FINDER ML PIPELINE LIVE TEST        ")
    print("==================================================")

    # 1. Model Metrics (MAE)
    print("\n[1] ML FORECASTER METRICS")
    print("Note: We are predicting a continuous percentage (0-100%), so we use Mean Absolute Error (MAE) instead of classification metrics (Precision/Recall/F1).")
    try:
        metrics = backtest_baseline()
        print(f"[SUCCESS] Model Baseline MAE: {metrics['Baseline MAE']:.2f}%")
        print(f"[SUCCESS] Naive Guess MAE:    {metrics['Naive MAE']:.2f}%")
        if metrics['Baseline MAE'] < metrics['Naive MAE']:
            print("   -> The ML model successfully outperforms random naive guessing.")
    except Exception as e:
        print(f"[FAILED] Failed to calculate metrics: {e}")

    client = TestClient(app)
    settings = get_settings()
    print(f"\n[Environment] GRID_MODE is set to: {settings.grid_mode}")
    
    # 2. Electricity Maps API (Live Grid)
    print("\n[2] EXTERNAL API: ELECTRICITY MAPS (/grid/live)")
    try:
        r = client.get("/grid/live?zoneId=IN")
        if r.status_code == 200:
            data = r.json()
            print(f"[SUCCESS] Quality tag: {data.get('quality')}")
            print(f"   -> Renewable %: {data.get('renewablePct')}%")
            print(f"   -> Carbon Intensity: {data.get('carbonIntensity')} gCO2eq/kWh")
        else:
            print(f"[FAILED] (Status {r.status_code}): {r.text}")
    except Exception as e:
        print(f"[FAILED] Exception occurred: {e}")

    # 3. Google Maps Routes API (Matrix)
    print("\n[3] EXTERNAL API: GOOGLE ROUTES API (/route/matrix)")
    matrix_payload = {
        "origin": {"lat": 19.0760, "lng": 72.8777}, # Mumbai
        "stationCoords": [
            {"lat": 19.0800, "lng": 72.8800},
            {"lat": 19.1000, "lng": 72.9000}
        ]
    }
    try:
        r = client.post("/route/matrix", json=matrix_payload)
        if r.status_code == 200:
            data = r.json()
            results = data.get("results", [])
            print(f"[SUCCESS] Routed {len(results)} stations.")
            for i, res in enumerate(results):
                fallback = "(Haversine Fallback Used)" if res.get("isEstimated") else "(Real Google API Used)"
                print(f"   -> Station {i+1}: {res.get('distanceKm')} km, {res.get('travelMinutes')} mins {fallback}")
        else:
            print(f"[FAILED] (Status {r.status_code}): {r.text}")
    except Exception as e:
        print(f"[FAILED] Exception occurred: {e}")

    # 4. End-to-End Recommendation Engine
    print("\n[4] CORE ML FLOW: RECOMMENDATION ENGINE (/recommend)")
    recommend_payload = {
        "origin": {"lat": 19.0760, "lng": 72.8777},
        "vehicle": {
            "vehicleClass": "car",
            "batteryKwh": 50.0,
            "efficiencyWhKm": 150.0,
            "connectors": ["Type2", "CCS2"],
            "currentChargePct": 20.0
        },
        "kwh": 20.0,
        "candidateStations": [
            {
                "id": "stat-1",
                "location": {"lat": 19.0800, "lng": 72.8800},
                "connectors": ["CCS2"],
                "finalPricePerKwh": 18.0,
                "provider": "Tata Power"
            },
            {
                "id": "stat-2",
                "location": {"lat": 19.1000, "lng": 72.9000},
                "connectors": ["CCS2"],
                "finalPricePerKwh": 12.0,
                "provider": "Jio-bp"
            }
        ]
    }
    try:
        r = client.post("/recommend", json=recommend_payload)
        if r.status_code == 200:
            recs = r.json()
            print(f"[SUCCESS] Ranked {len(recs)} stations.")
            for i, rec in enumerate(recs):
                reason_clean = rec.get('reason', '').replace('₹', 'Rs.')
                print(f"   #{i+1}: Station {rec.get('stationId')} | True Total Cost: Rs.{rec.get('trueTotalCost')} | Reason: {reason_clean}")
        else:
            print(f"[FAILED] (Status {r.status_code}): {r.text}")
    except Exception as e:
        print(f"[FAILED] Exception occurred: {e}")

    # 5. End-to-End Smart Charge Optimizer
    print("\n[5] CORE ML FLOW: SMART CHARGE OPTIMIZER (/smartcharge/plan)")
    smartcharge_payload = {
        "zoneId": "IN",
        "stationId": "stat-1",
        "chargeRateKw": 11.0,
        "energyNeededKwh": 20.0,
        "deadlineLocal": "2026-10-01T18:00:00+05:30",
        "urgent": False,
        "tariff": 15.0
    }
    try:
        r = client.post("/smartcharge/plan", json=smartcharge_payload)
        if r.status_code == 200:
            data = r.json()
            print(f"[SUCCESS] Generated Charging Plan.")
            print(f"   -> Start Time (IST): {data.get('startLocal')}")
            print(f"   -> Expected Renewable %: {data.get('expectedRenewablePct')}%")
            print(f"   -> Reason: {data.get('note')}")
        else:
            print(f"[FAILED] (Status {r.status_code}): {r.text}")
    except Exception as e:
        print(f"[FAILED] Exception occurred: {e}")
        
    print("\n==================================================")
    print("                 TEST COMPLETE                    ")
    print("==================================================")

if __name__ == "__main__":
    run_live_tests()
