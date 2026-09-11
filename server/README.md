# ecoVolt-finder — Backend REST API (Member 2)

Node + Express + TypeScript + PostgreSQL backend for **ecoVolt-finder** — India's renewable-aware EV charging & dynamic pricing platform.

---

## ⚡ Key Highlights & Architecture

- **Clean Layered Architecture**: Routes $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Prisma ORM.
- **Robust Concurrency & Price Locking**: PostgreSQL interactive transactions with row-level locks (`SELECT ... FOR UPDATE`) preventing double-booking and capturing immutable 30-min price-lock snapshots.
- **Multi-Provider Pricing Engine**: Implements the multi-provider pricing formula ($\text{finalPrice} = \text{baseTariff} + \text{markup} + \text{touAdjustment}$) with 60% price floor protection.
- **Resilient Hybrid ML Integration**: Fronts Member 3's FastAPI ML service with a 2s timeout, 60s in-memory cache, and automatic mock fallback (`/contracts/examples/*.json`).
- **Server-Side Google Proxy**: Proxies Distance Matrix, Geocoding, and Haversine fallbacks without leaking Google API keys to client apps.
- **Extensible Notifications**: Mock & Expo push notification provider with smart green-window starting nudges and connector outage alerts.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ or v20+
- **PostgreSQL**: Native instance or Docker running on port `5432` with database `ecovolt_db`.

### 2. Environment Setup
Copy or configure `.env` in `/server`:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://ecovolt:ecovolt_password@localhost:5432/ecovolt_db?schema=public
JWT_SECRET=super_secret_jwt_key_ecovolt_dev_2026
JWT_REFRESH_SECRET=super_secret_jwt_refresh_key_ecovolt_dev_2026
ML_SERVICE_URL=http://localhost:8000
GOOGLE_SERVER_KEY=
CORS_ORIGINS=http://localhost:19006,http://localhost:3000,http://localhost:8081
```

### 3. Database Migration & Demo Seed
```bash
# Push schema to database
npm run prisma:push

# Populate realistic Indian demo dataset (Grid zones, DISCOM tariffs, stations, users, sample session)
npm run prisma:seed
```

### 4. Running the Development Server
```bash
npm run dev
```
The API will start at `http://localhost:4000`. Interactive OpenAPI documentation is available at `http://localhost:4000/docs`.

### 5. Running the Automated Test Suite
```bash
npm test
```

---

## 📖 API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Service health check & DB ping | ❌ |
| `GET` | `/docs` | Interactive Swagger UI documentation | ❌ |
| `POST` | `/auth/signup` | Register driver, manager, or admin user | ❌ |
| `POST` | `/auth/login` | Login and obtain access & refresh JWTs | ❌ |
| `POST` | `/auth/refresh` | Rotate access token via refresh token | ❌ |
| `GET` / `PATCH` | `/me` | View / update current user profile | ✅ |
| `GET` / `POST` | `/vehicles` | List or add EV profiles (car, bike) | ✅ |
| `PATCH` / `DELETE` | `/vehicles/:id` | Update or delete vehicle profile | ✅ |
| `GET` | `/stations` | Geo-search stations with Haversine filter | ❌ |
| `GET` | `/stations/:id` | Full station detail with connectors & pricing | ❌ |
| `POST` | `/stations` | Create charging station (Manager only) | ✅ (`manager`) |
| `PATCH` | `/stations/:id` | Update station details (Owner only) | ✅ (`manager`) |
| `GET` | `/pricing/quote` | Real-time price quote & ToU green adjustment | ❌ |
| `POST` | `/bookings` | Reserve slot with anti-double-booking lock | ✅ |
| `PATCH` | `/bookings/:id/cancel` | Cancel booking within grace window | ✅ |
| `POST` | `/sessions/:id/start` | Start session from reserved booking | ✅ |
| `POST` | `/sessions/:id/stop` | End session, bill locked price, compute $CO_2$ | ✅ |
| `GET` | `/sessions/:id` | View live session telemetry and status | ✅ |
| `GET` | `/recommendations` | Proxied ranked recommendations from ML | ✅ |
| `GET` | `/forecast` | Proxied 24-hour renewable forecast points | ❌ |
| `GET` | `/impact/me` | Driver lifetime impact (savings, $CO_2$, %) | ✅ |
| `GET` | `/analytics/station/:id`| Station revenue, occupancy, demand-charge risk | ✅ (`manager`) |
| `GET` | `/analytics/network` | Network-wide grid load & green energy stats | ✅ (`admin`) |
| `POST` | `/notifications/token` | Register Expo push notification token | ✅ |
| `GET` | `/notifications` | Notification history & green nudges | ✅ |

---

## 🔒 Security & Edge Case Defenses

- **Strict Role & Ownership Guards**: Managers can never mutate or read private analytics of competitors' stations (`requireStationOwnership`, Edge Case #22).
- **Google Secret Shield**: Google Maps API keys are kept strictly on the backend and never exposed in client payloads (Edge Case #25).
- **Graceful ML Degradation**: If Member 3's ML service is offline, backend gracefully serves contract-compliant mock data tagged `DataQuality.MOCK` without crashing (Edge Case #12).
- **Concurrency Serialization**: Interactive transactions with row-level locks prevent race conditions during simultaneous peak reservations (Edge Case #15).
- **Demand Charge Alerting**: Surfaces real-time load risk before stations exceed grid contract thresholds (Edge Case #16).
