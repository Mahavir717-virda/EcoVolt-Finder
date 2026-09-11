# ⚡ ecoVolt-finder — Complete Postman API Testing & Dynamic Data Verification Guide

This guide details how to test every single endpoint of the **ecoVolt-finder** backend using **Postman** (or any REST client). It verifies that all database models, real-time calculations, price locking, concurrency guards, analytics, and resilient fallbacks work dynamically with zero breaking errors.

---

## 🛠️ 1. Postman Environment Setup

Create an Environment in Postman called **`ecoVolt Local`** with the following variables:

| Variable | Initial Value | Current Value | Notes |
| :--- | :--- | :--- | :--- |
| `baseUrl` | `http://localhost:4000` | `http://localhost:4000` | Backend API root |
| `driverToken` | *(leave blank)* | *(auto-set via Login/Signup)* | Driver JWT Access Token |
| `managerToken` | *(leave blank)* | *(auto-set via Login/Signup)* | Manager JWT Access Token |
| `adminToken` | *(leave blank)* | *(auto-set via Login/Signup)* | Admin JWT Access Token |
| `vehicleId` | *(leave blank)* | *(set after vehicle creation)* | Dynamic vehicle UUID |
| `stationId` | *(leave blank)* | *(set after station query)* | Dynamic station UUID |
| `bookingId` | *(leave blank)* | *(set after booking creation)* | Dynamic booking UUID |
| `sessionId` | *(leave blank)* | *(set after session start)* | Dynamic session UUID |

> [!TIP]
> **Post-response Script (Tests tab in Postman):**  
> To automatically save tokens to environment variables, paste this in the **Tests** tab of your Login / Signup requests:
> ```javascript
> const res = pm.response.json();
> if (res.accessToken) {
>     pm.environment.set("driverToken", res.accessToken);
> }
> ```

---

## 🚀 2. Pre-requisite: Database Reset & Seed

Before starting, ensure your database is fresh with the standard seed data:
```bash
cd server
npm run prisma:push
npm run prisma:seed
npm run dev
```

---

## 📋 3. Step-by-Step Endpoint Testing Flow

Follow this exact flow to test dynamic state mutations from user onboarding to charging completion and analytics.

---

### Phase 1: Health & System Diagnostics

#### 1. `GET /health`
- **Description:** Verifies service uptime and database connectivity.
- **Method:** `GET`
- **URL:** `{{baseUrl}}/health`
- **Headers:** None
- **Expected Status:** `200 OK`
- **Expected Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-09-12T01:30:00.000Z",
  "uptime": 12.4
}
```

#### 2. `GET /docs`
- **Description:** Interactive OpenAPI Swagger UI.
- **Method:** `GET`
- **URL:** `{{baseUrl}}/docs/`
- **Expected Status:** `200 OK` (HTML page rendered)

---

### Phase 2: Auth & Role-Based Access Control (RBAC)

#### 3. `POST /auth/signup` (Create Dynamic Driver)
- **Description:** Register a new driver user.
- **Method:** `POST`
- **URL:** `{{baseUrl}}/auth/signup`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "email": "driver.test@ecovolt.in",
  "password": "Password123!",
  "name": "Karan Sharma",
  "role": "driver"
}
```
- **Expected Status:** `201 Created`
- **Expected Response:** Contains `accessToken`, `refreshToken`, and `user` object. Save `accessToken` to `{{driverToken}}`.

#### 4. `POST /auth/login` (Driver Login)
- **Description:** Authenticate existing driver.
- **Method:** `POST`
- **URL:** `{{baseUrl}}/auth/login`
- **Body (raw JSON):**
```json
{
  "email": "driver@ecovolt.in",
  "password": "Password123!"
}
```
- **Expected Status:** `200 OK`

#### 5. `POST /auth/login` (Manager Login)
- **Description:** Authenticate demo manager (`manager@ecovolt.in`).
- **Method:** `POST`
- **URL:** `{{baseUrl}}/auth/login`
- **Body (raw JSON):**
```json
{
  "email": "manager@ecovolt.in",
  "password": "Password123!"
}
```
- **Expected Status:** `200 OK`. Save `accessToken` to `{{managerToken}}`.

#### 6. `POST /auth/login` (Admin Login)
- **Description:** Authenticate demo admin (`admin@ecovolt.in`).
- **Method:** `POST`
- **URL:** `{{baseUrl}}/auth/login`
- **Body (raw JSON):**
```json
{
  "email": "admin@ecovolt.in",
  "password": "Password123!"
}
```
- **Expected Status:** `200 OK`. Save `accessToken` to `{{adminToken}}`.

#### 7. `POST /auth/refresh`
- **Description:** Rotate token using refresh token.
- **Method:** `POST`
- **URL:** `{{baseUrl}}/auth/refresh`
- **Body (raw JSON):**
```json
{
  "refreshToken": "<your_refresh_token_here>"
}
```
- **Expected Status:** `200 OK` (Returns new `accessToken`)

#### 8. `GET /me`
- **Description:** Retrieve current authenticated user profile.
- **Method:** `GET`
- **URL:** `{{baseUrl}}/me`
- **Headers:** `Authorization: Bearer {{driverToken}}`
- **Expected Status:** `200 OK`

#### 9. `PATCH /me`
- **Description:** Update profile name.
- **Method:** `PATCH`
- **URL:** `{{baseUrl}}/me`
- **Headers:** `Authorization: Bearer {{driverToken}}`
- **Body (raw JSON):**
```json
{
  "name": "Karan Sharma (Verified)"
}
```
- **Expected Status:** `200 OK`

---

### Phase 3: Vehicle Management & Class Defaults

#### 10. `POST /vehicles` (Add EV with Class Defaults)
- **Description:** Adds vehicle for driver. Notice efficiency defaults to 140 Wh/km for car if omitted.
- **Method:** `POST`
- **URL:** `{{baseUrl}}/vehicles`
- **Headers:** `Authorization: Bearer {{driverToken}}`
- **Body (raw JSON):**
```json
{
  "vehicleClass": "car",
  "model": "Tata Punch EV Long Range",
  "batteryKwh": 35.0,
  "efficiencyWhKm": 135.0,
  "connectors": ["ccs2", "type2_ac"],
  "currentChargePct": 28.0
}
```
- **Expected Status:** `201 Created`
- **Action:** Copy response `id` to `{{vehicleId}}`.

#### 11. `GET /vehicles`
- **Description:** List all vehicles belonging to the driver.
- **Method:** `GET`
- **URL:** `{{baseUrl}}/vehicles`
- **Headers:** `Authorization: Bearer {{driverToken}}`
- **Expected Status:** `200 OK` (Array with at least 1 vehicle).

#### 12. `PATCH /vehicles/:id`
- **Description:** Update current charge percentage after a drive.
- **Method:** `PATCH`
- **URL:** `{{baseUrl}}/vehicles/{{vehicleId}}`
- **Headers:** `Authorization: Bearer {{driverToken}}`
- **Body (raw JSON):**
```json
{
  "currentChargePct": 20.0
}
```
- **Expected Status:** `200 OK`

---

### Phase 4: Stations & Geo Search

#### 13. `GET /stations` (Geo-Search with Radius & Filters)
- **Description:** Search nearby EV stations around Ahmedabad with Haversine distance ranking.
- **Method:** `GET`
- **URL:** `{{baseUrl}}/stations?lat=23.0441&lng=72.5085&radiusKm=15&connector=ccs2&sort=nearest`
- **Expected Status:** `200 OK`
- **Action:** Copy any returned station `id` to `{{stationId}}`.

#### 14. `GET /stations/:id`
- **Description:** View complete station details, operator, real-time connector availability, and pricing rules.
- **Method:** `GET`
- **URL:** `{{baseUrl}}/stations/{{stationId}}`
- **Expected Status:** `200 OK`

#### 15. `POST /stations` (Create Station — Manager Only)
- **Description:** Add a new station under manager's operator.
- **Method:** `POST`
- **URL:** `{{baseUrl}}/stations`
- **Headers:** `Authorization: Bearer {{managerToken}}`
- **Body (raw JSON):**
```json
{
  "name": "EcoVolt Supercharger — Gift City",
  "location": { "lat": 23.1610, "lng": 72.6840 },
  "provider": "torrent_power"
}
```
- **Expected Status:** `201 Created`

#### 16. `POST /stations/:id/connectors`
- **Description:** Add fast DC connector to the newly created station.
- **Method:** `POST`
- **URL:** `{{baseUrl}}/stations/{{stationId}}/connectors`
- **Headers:** `Authorization: Bearer {{managerToken}}`
- **Body (raw JSON):**
```json
{
  "type": "ccs2",
  "powerKw": 150.0,
  "totalCount": 4
}
```
- **Expected Status:** `201 Created`

---

### Phase 5: Dynamic Multi-Provider Pricing Engine

#### 17. `GET /pricing/quote`
- **Description:** Computes dynamic price quote: $\text{finalPrice} = \text{baseTariff} + \text{markup} + \text{touAdjustment}$.
- **Method:** `GET`
- **URL:** `{{baseUrl}}/pricing/quote?stationId={{stationId}}&connector=ccs2&kwh=20`
- **Expected Status:** `200 OK`
- **Expected Response:**
```json
{
  "stationId": "...",
  "connectorType": "ccs2",
  "baseTariff": 13.5,
  "providerMarkup": 3.5,
  "touAdjustment": -2.5,
  "finalPrice": 14.5,
  "isEstimate": false,
  "currency": "INR",
  "validUntil": "2026-09-12T02:00:00.000Z"
}
```

---

### Phase 6: Booking & Concurrency Anti-Double-Booking

#### 18. `POST /bookings` (Reserve Slot & Lock Price)
- **Description:** Atomically reserves a connector slot inside a PostgreSQL transaction and locks the quoted price.
- **Method:** `POST`
- **URL:** `{{baseUrl}}/bookings`
- **Headers:** `Authorization: Bearer {{driverToken}}`
- **Body (raw JSON):**
```json
{
  "stationId": "{{stationId}}",
  "connectorType": "ccs2",
  "vehicleId": "{{vehicleId}}",
  "windowStart": "2026-09-12T12:00:00.000Z",
  "windowEnd": "2026-09-12T13:30:00.000Z"
}
```
- **Expected Status:** `201 Created`
- **Action:** Copy response `id` to `{{bookingId}}`.

#### 19. `GET /bookings`
- **Description:** View all active and past bookings for driver.
- **Method:** `GET`
- **URL:** `{{baseUrl}}/bookings`
- **Headers:** `Authorization: Bearer {{driverToken}}`
- **Expected Status:** `200 OK`

#### 20. `PATCH /bookings/:id/cancel` (Grace Window Cancellation)
- **Description:** Cancels booking and releases connector slot if inside the allowable grace window.
- **Method:** `PATCH`
- **URL:** `{{baseUrl}}/bookings/{{bookingId}}/cancel`
- **Headers:** `Authorization: Bearer {{driverToken}}`
- **Expected Status:** `200 OK`

---

### Phase 7: Session Lifecycle & Metered Billing

#### 21. `POST /sessions/:id/start` (Start Session)
- **Description:** Starts charging session from an active booking.
- **Method:** `POST`
- **URL:** `{{baseUrl}}/sessions/{{bookingId}}/start`
- **Headers:** `Authorization: Bearer {{driverToken}}`
- **Expected Status:** `200 OK`
- **Action:** Copy response `id` to `{{sessionId}}`.

#### 22. `GET /sessions/:id` (Live Session Telemetry)
- **Description:** Retrieve current status, duration, and charger state.
- **Method:** `GET`
- **URL:** `{{baseUrl}}/sessions/{{sessionId}}`
- **Headers:** `Authorization: Bearer {{driverToken}}`
- **Expected Status:** `200 OK` (Status is `active`).

#### 23. `POST /sessions/:id/stop` (Stop & Compute avoided $CO_2$)
- **Description:** Stops charging, bills strictly at the locked price snapshot, calculates energy delivered, and determines $CO_2$ avoided.
- **Method:** `POST`
- **URL:** `{{baseUrl}}/sessions/{{sessionId}}/stop`
- **Headers:** `Authorization: Bearer {{driverToken}}`
- **Body (raw JSON):**
```json
{
  "energyKwh": 22.5
}
```
- **Expected Status:** `200 OK`
- **Expected Response:**
```json
{
  "id": "...",
  "status": "completed",
  "energyKwh": 22.5,
  "cost": 326.25,
  "avgRenewablePct": 76.5,
  "co2AvoidedKg": 12.22
}
```

---

### Phase 8: ML Integrations & 24h Renewable Forecast

#### 24. `GET /forecast`
- **Description:** 24-hour renewable % and carbon intensity forecast for Western Regional Grid (`IN-WE`).
- **Method:** `GET`
- **URL:** `{{baseUrl}}/forecast?zoneId=IN-WE`
- **Expected Status:** `200 OK` (Array of 24 `ForecastPoint` items).

#### 25. `GET /recommendations`
- **Description:** Returns candidate stations ranked by **True Total Cost** (Charging Cost + Travel Cost), factoring in vehicle battery level.
- **Method:** `GET`
- **URL:** `{{baseUrl}}/recommendations?originLat=23.0225&originLng=72.5714&vehicleId={{vehicleId}}&kwh=18.0`
- **Headers:** `Authorization: Bearer {{driverToken}}`
- **Expected Status:** `200 OK` (Array of `StationRecommendation` items).

---

### Phase 9: Impact & Analytics APIs

#### 26. `GET /impact/me` (Driver Lifetime Impact)
- **Description:** Driver personal dashboard showing total kWh, ₹ spent, ₹ saved vs sticker price, and kg $CO_2$ avoided.
- **Method:** `GET`
- **URL:** `{{baseUrl}}/impact/me`
- **Headers:** `Authorization: Bearer {{driverToken}}`
- **Expected Status:** `200 OK`
- **Expected Response:**
```json
{
  "userId": "...",
  "totalSessions": 2,
  "totalKwh": 47.0,
  "totalSpent": 681.5,
  "savedVsSticker": 117.5,
  "co2AvoidedKg": 26.42,
  "avgRenewablePct": 77.5
}
```

#### 27. `GET /analytics/station/:id` (Manager Station Analytics)
- **Description:** Manager occupancy, revenue, and **Demand-Charge Risk Signal** (`low`, `medium`, `high`).
- **Method:** `GET`
- **URL:** `{{baseUrl}}/analytics/station/{{stationId}}`
- **Headers:** `Authorization: Bearer {{managerToken}}`
- **Expected Status:** `200 OK`

#### 28. `GET /analytics/network` (Admin Macro Overview)
- **Description:** Aggregate network stats, grid load, and total charging sessions shifted to green windows.
- **Method:** `GET`
- **URL:** `{{baseUrl}}/analytics/network`
- **Headers:** `Authorization: Bearer {{adminToken}}`
- **Expected Status:** `200 OK`

---

### Phase 10: Push Notifications & Incentive Nudges

#### 29. `POST /notifications/token`
- **Description:** Registers user's Expo push notification token.
- **Method:** `POST`
- **URL:** `{{baseUrl}}/notifications/token`
- **Headers:** `Authorization: Bearer {{driverToken}}`
- **Body (raw JSON):**
```json
{
  "token": "ExponentPushToken[demo_push_token_postman_12345]"
}
```
- **Expected Status:** `200 OK`

#### 30. `GET /notifications`
- **Description:** View all dispatch history (green window start, booking reminder, session completed).
- **Method:** `GET`
- **URL:** `{{baseUrl}}/notifications`
- **Headers:** `Authorization: Bearer {{driverToken}}`
- **Expected Status:** `200 OK`

---

## 🛡️ 4. Edge-Case & Error Verification Matrix

Execute these test cases in Postman to verify that the backend handles edge cases and rejects invalid requests cleanly:

| # | Test Scenario | Request | Expected Status | Error Code | Reason / Guard |
| :- | :--- | :--- | :--- | :--- | :--- |
| **1** | Duplicate Signup Email | `POST /auth/signup` with existing email | `409 Conflict` | `CONFLICT` | Email uniqueness check |
| **2** | Invalid Password | `POST /auth/login` with wrong password | `401 Unauthorized` | `UNAUTHORIZED` | Prevents credential leaks |
| **3** | Unauthenticated Access | `GET /me` without `Authorization` header | `401 Unauthorized` | `UNAUTHORIZED` | Token verification |
| **4** | Negative Battery Capacity | `POST /vehicles` with `batteryKwh: -10` | `422 Unprocessable` | `VALIDATION_ERROR` | Zod numeric bounds |
| **5** | Manager Mutates Other Station | `PATCH /stations/:id` with non-owner manager token | `403 Forbidden` | `FORBIDDEN` | Ownership guard (Edge Case #22) |
| **6** | Driver Accesses Admin Analytics | `GET /analytics/network` with driver token | `403 Forbidden` | `FORBIDDEN` | Role-based guard |
| **7** | Double Stop on Session | `POST /sessions/:id/stop` twice on same session | `409 Conflict` | `CONFLICT` | Prevents duplicate billing |
| **8** | Invalid Station Coordinates | `GET /recommendations?originLat=invalid` | `400 Bad Request` | `BAD_REQUEST` | Query parameter validation |
| **9** | ML Service Down Fallback | Stop ML service and call `GET /recommendations` | `200 OK` | N/A | Graceful mock fallback (`DataQuality.MOCK`) |
| **10**| Secret Leakage Check | Inspect any JSON response | `200 OK` | N/A | `GOOGLE_SERVER_KEY` / `JWT_SECRET` never present |

---

## ✅ Summary of Verification

Once all 30 endpoints and 10 edge-case tests return their expected status codes:
1. **Dynamic Data Flow**: Confirmed — all values (energy, price locks, user profiles, distance metrics, $CO_2$ avoided, revenue) reflect dynamic database records.
2. **Zero Breaking Failures**: Confirmed — every failure path returns standard `{ error: { code, message, details } }` structures.
3. **Demo Readiness**: 100% complete for full end-to-end multi-persona demonstration.
