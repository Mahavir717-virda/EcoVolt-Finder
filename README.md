# ecoVolt-finder 🌱⚡

> **EV charging, powered by the greenest moment on the grid.**

ecoVolt-finder helps EV drivers charge when and where the grid is greenest and cheapest — and helps charging-network operators price and schedule sessions to match renewable supply.

---

## Monorepo Structure

```
ecovolt-finder/
├── app/          ← Member 1 (Deep) — React Native + Expo (Android Expo Go)
├── server/       ← Member 2 (Mahavir) — Node.js + Express + TypeScript + PostgreSQL
├── ml/           ← Member 3 (Dhruvin) — Python + FastAPI (grid, ML, routing, recommendations)
├── contracts/    ← SHARED — change-controlled (all 3 review before merging)
│   ├── enums.ts
│   ├── types.ts
│   ├── openapi.node.yaml
│   ├── openapi.ml.yaml
│   └── examples/          ← Mock responses for every endpoint
└── docs/
    ├── DESIGN_SYSTEM.md
    ├── EDGE_CASES.md
    └── notes/             ← Agent think-first design notes land here
```

---

## Team

| Member | Role | Branch prefix | Owns |
|---|---|---|---|
| Member 1 (Deep) | App / UI | `m1/` or `frontend/deep` | `/app` |
| Member 2 (Mahavir) | Backend / API | `m2/` or `backend/mahavir` | `/server` |
| Member 3 (Dhruvin) | ML / Data / Maps | `m3/` or `ML/dhruvin` | `/ml` |

**The `/contracts` folder is owned by all three.** Any change there requires a review from the other two members before merge.

---

## Quick Start — Each Service

### App (Member 1)
```bash
cd app
cp .env.example .env        # fill in GOOGLE_MAPS_ANDROID_KEY + API_BASE_URL
npm install
npx expo start              # scan QR with Android Expo Go
```
See [app/README.md](app/README.md) for the full setup guide.

### Server (Member 2)
```bash
cd server
cp .env.example .env        # fill in DATABASE_URL, JWT secrets, etc.
npm install
npm run dev                 # http://localhost:4000
```
See [server/README.md](server/README.md).

### ML Service (Member 3)
```bash
cd ml
cp .env.example .env        # fill in ELECTRICITY_MAPS_TOKEN, etc.
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
See [ml/README.md](ml/README.md).

---

## Working with Mocks (Phase 0 → Phase 1)

All three services can operate in **mock mode** using the realistic sample responses in `/contracts/examples/`.

- **App:** Set `USE_MOCKS=true` in `app/.env` — the `http.ts` layer returns the example JSONs instead of hitting the network.
- **ML service:** Set `GRID_MODE=mock` — all grid data returns seeded mock values.
- **Server:** When the ML service is down, the integration layer falls back to the example payloads and tags them `DataQuality.MOCK`.

This means **Member 1 (UI) is never blocked** waiting for the backend or ML service.

---

## Branch & PR Convention

```
Branch name:   m1/c1-bootstrap  |  m2/c5-stations  |  m3/c9-recommend
Commit format: M1-C1: expo bootstrap + navigation + http layer
PR target:     main (direct for now)
```

---

## Build Playbook

Full chunk-by-chunk prompts for all 3 members: [ecoVolt-finder-antigravity-prompts.md](ecoVolt-finder-antigravity-prompts.md)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | React Native + Expo (Android Expo Go), `react-native-maps` |
| API backend | Node.js + Express + TypeScript + PostgreSQL |
| ML / data | Python + FastAPI |
| Grid data | Electricity Maps API + mock fallback |
| Maps / routing | Google Maps Platform (server-side proxy) |
| Currency / units | INR (₹), kWh, km, Asia/Kolkata (IST) |
