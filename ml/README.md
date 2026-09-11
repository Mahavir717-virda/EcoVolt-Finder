# ecoVolt-finder — ML Service (Member 3)

Python + FastAPI microservice for grid data ingestion, renewable classification,
forecasting, routing, travel-cost modelling, and recommendation ranking.

## Setup

```bash
cp .env.example .env
# Fill in ELECTRICITY_MAPS_TOKEN, GOOGLE_SERVER_KEY
# Set GRID_MODE=mock for offline development

python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

## Running

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# API docs: http://localhost:8000/docs
```

## Key Decisions

- `GRID_MODE=hybrid` (try live → cache → mock) — demo never breaks if wifi dies.
- Every grid value is tagged `DataQuality` (live/cached/mock/stale) — the app always shows this.
- **Renewable ≠ Carbon-free**: `renewablePct` excludes nuclear; `carbonFreePct` includes it.
- `unknown/other` generation is **excluded from the numerator**, never guessed.
- All timestamps stored UTC; IST conversion happens in feature engineering.
- Google server key is read from env — never shipped in the app.
- Recommendation ranks by `trueTotalCost = chargingCost + travelCost`, NOT sticker ₹/kWh.
- Route matrix only called for nearest-K stations (pre-filtered by haversine) to control quota.

## Folder Structure (after M3-C1)

```
app/
├── ingestion/       # Electricity Maps, India Atlas, mock generator, resolver
├── classify/        # Renewable taxonomy + zone mapping
├── forecast/        # Feature engineering + forecasting models
├── pricing/         # ToU + greenness cost estimator (windows)
├── routing/         # Google Routes/Matrix client + haversine fallback
├── recommend/       # Travel-cost model + net-benefit ranking + smart-charge
└── main.py
```

## Chunks to implement

| Chunk | Description | Branch |
|---|---|---|
| M3-C1 | FastAPI bootstrap + stubbed endpoints + example payloads | `m3/c1-bootstrap` |
| M3-C2 | Hybrid grid data ingestion | `m3/c2-ingestion` |
| M3-C3 | Renewable classification + zone mapping | `m3/c3-classify` |
| M3-C4 | Historical store + feature engineering (IST) | `m3/c4-features` |
| M3-C5 | Renewable % forecaster + confidence + backtest | `m3/c5-forecast` |
| M3-C6 | Cost/greenness window estimator | `m3/c6-windows` |
| M3-C7 | Google routing + matrix + cache + fallback | `m3/c7-routing` |
| M3-C8 | Travel-cost + range model (bike vs car) | `m3/c8-travel-cost` |
| M3-C9 | Net-benefit recommendation engine | `m3/c9-recommend` |
| M3-C10 | Smart-charge optimizer | `m3/c10-smartcharge` |
| M3-C11 | Guardrails + validation + explainability | `m3/c11-validation` |
| M3-C12 | Packaging + demo data + integration finalize | `m3/c12-package` |

## Mock Mode

Set `GRID_MODE=mock` to run fully offline. All endpoints return Indian-shaped seeded data.
Set `MOCK_SEED=42` in `.env` for reproducible demos.

Commit your first stub implementation (M3-C1) with all endpoints returning the
`/contracts/examples/*.json` payloads so Member 1 and 2 can integrate immediately.
