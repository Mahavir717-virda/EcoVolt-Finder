# ecoVolt-finder — Server (Member 2)

Node.js + Express + TypeScript + PostgreSQL backend.

## Setup

```bash
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, ML_SERVICE_URL, GOOGLE_SERVER_KEY
```

## Running

```bash
npm install
npm run dev         # starts with ts-node-dev, http://localhost:4000
```

## Key Decisions

- All shared types come from `../contracts/types.ts` and `../contracts/enums.ts`.
- The Google server key is **never exposed to the client** — all routing/geocoding is proxied here.
- When the ML service is down, fall back to `../contracts/examples/*.json` and tag as `DataQuality.MOCK`.
- Booking reservations use DB transactions + row locks to prevent double-booking.

## Folder Structure (after M2-C1)

```
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── vehicles/
│   ├── stations/
│   ├── pricing/
│   ├── bookings/
│   ├── sessions/
│   └── analytics/
├── db/              # Schema, migrations, seed
├── middleware/      # Auth guards, error handler, rate limit, validation
├── integrations/   # ML service client, Google proxy
├── app.ts
└── server.ts
```

## Chunks to implement

| Chunk | Description | Branch |
|---|---|---|
| M2-C1 | Server bootstrap + DB connection + middleware | `m2/c1-bootstrap` |
| M2-C2 | Database schema + migrations + seed | `m2/c2-schema` |
| M2-C3 | Auth + RBAC (JWT, refresh, roles) | `m2/c3-auth` |
| M2-C4 | Users + vehicles API | `m2/c4-vehicles` |
| M2-C5 | Stations + operators + geo search | `m2/c5-stations` |
| M2-C6 | Pricing engine (multi-provider) | `m2/c6-pricing` |
| M2-C7 | Booking + scheduling engine | `m2/c7-bookings` |
| M2-C8 | Session lifecycle + metering | `m2/c8-sessions` |
| M2-C9 | ML service + Google proxy integration | `m2/c9-integrations` |
| M2-C10 | Impact + analytics APIs | `m2/c10-analytics` |
| M2-C11 | Notifications + incentive nudges | `m2/c11-notify` |
| M2-C12 | Hardening + tests + seed + OpenAPI finalize | `m2/c12-harden` |
