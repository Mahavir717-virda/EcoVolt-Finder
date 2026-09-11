# ecoVolt-finder 🌱⚡
## Project Ideation & Technical Design Report

**Project Title:** ecoVolt-finder — Smart, Green, and True-Cost EV Charging & Load-Balancing Platform  
**Team Name:** ecoVolt Team  
**Team Members:**  
- **Mahavir Virda** (Member 2 — Backend / API & System Architecture)  
- **Deep** (Member 1 — Mobile App & UI/UX Design)  
- **Dhruvin** (Member 3 — ML / Grid Forecasting & Routing Engine)  

---

## Executive Summary

**ecoVolt-finder** is an intelligent, full-stack EV charging ecosystem designed to solve the critical gap between expanding EV adoption and power grid sustainability in India. While standard EV navigation apps focus solely on distance or sticker price per kWh, **ecoVolt-finder** turns the invisible metric of **"Grid Greenness"** (real-time renewable vs. thermal energy share) into visible, actionable choices. 

By calculating **True Total Cost** (Energy Cost + Vehicle-Specific Travel Cost) and scheduling **Smart-Charging Windows** during peak renewable generation, the platform creates a dual incentive: **EV drivers save money and cut carbon emissions**, while **charging station operators optimize power procurement costs and avoid demand-charge grid penalties**.

---

## 1. Problem Statement

1. **The "Green EV" Irony:** Electric vehicles in India often charge from coal-heavy grids during peak evening hours (6 PM – 10 PM), unintentionally causing high carbon emissions and straining the grid.
2. **The "Cheaper-But-Farther" Trap:** Drivers frequently navigate to stations with a slightly lower sticker price (e.g., ₹2 cheaper per kWh), unaware that battery depletion and travel costs over the extra distance completely wipe out their savings.
3. **Fragmented Power Tariffs & Provider Discrepancies:** Indian DISCOMs and private distribution companies (Torrent Power, GUVNL, Adani Energy, Tata Power, BSES) feature varying base tariffs, slab structures, and Time-of-Use (ToU) charges that are non-transparent to users.
4. **Grid Stress & Peak Demand Charges for Operators:** EV charging stations face steep peak demand surcharges when multiple fast chargers operate simultaneously during high-tariff periods.

---

## 2. Proposed Solution

**ecoVolt-finder** introduces a closed-loop platform connecting drivers, charging operators, and the power grid:

```
Driver plugs in ──▶ App reads live + forecast grid greenness for the station's zone
        ▲                                     │
        │                                     ▼
   Savings + CO₂                  App finds the cheapest & greenest window
   shown back to          ◀────   (and/or a better station once travel cost is
   the driver                     subtracted) ──▶ Smart-schedule automated charge
```

### Core Value Pillars:
1. **Live Grid Greenness & Carbon Tracking:** Live breakdown of renewable energy share (solar, wind, hydro, biomass) vs. carbon intensity (gCO₂eq/kWh) per regional grid zone (e.g., `IN-WE`, `IN-NO`, `IN-SO`).
2. **True Total Cost Recommendation Engine:** Ranks candidate stations using:
   $$\text{TrueTotalCost} = \text{ChargingCost}(\text{₹}) + \text{TravelCost}(\text{₹})$$
   Exposes the `vsCheapestSticker` delta so drivers clearly see true net financial gain.
3. **Automated Smart-Charging with Price Lock:** Quoted price and green discount are cryptographically locked until departure; sessions can be automatically delayed to peak solar/wind hours (e.g., 1:00 PM – 3:30 PM).
4. **Operator Dynamic Pricing & Demand-Charge Protection:** Station managers set base tariffs per provider, apply service markups, configure dynamic green discounts, and monitor station-level demand-charge risk.

---

## 3. Key Features & Role-Based Workflows

### 3.1 EV Driver Experience (Mobile App)
- **Vehicle-Aware Profiles:** Supports 4-wheelers and 2-wheelers (Car/Bike) with battery capacity (kWh), real-world efficiency (Wh/km), connector compatibility (CCS2, Type-2 AC, Bharat DC), and live state of charge (SoC %).
- **Interactive Green Map & Proximity Filter:** Map markers dynamically colored by greenness band (`Very High`, `High`, `Medium`, `Low`, `Very Low`).
- **Station Detail & 24h Renewable Sparkline:** Visual 24-hour renewable forecast strip with confidence intervals and highlighted optimal charging windows.
- **Smart Charge vs. Urgent Override:** One-tap choice between maximum green savings or immediate urgent charging.
- **Active Session Telemetry & Impact Dashboard:** Real-time charging progress pulse, accrued cost at locked price, avg renewable % achieved, lifetime ₹ saved, and lifetime kg CO₂ avoided.

### 3.2 Charging Station Manager Experience
- **Multi-Provider Tariff Configuration:** Configures DISCOM/provider base tariffs (Torrent, GUVNL, Tata, Adani) + operator markup.
- **Dynamic Green Incentive Toggle:** Enables algorithmic ToU discounts during clean energy abundance to attract vehicle load.
- **Demand-Charge Risk Meter:** Live monitoring of concurrent charging load to prevent substation overload penalties.
- **Connector Health & Status Management:** Remote maintenance and live occupancy toggling.

### 3.3 Grid Operator / Admin Oversight
- **Network-Wide Aggregations:** Macro view of EV load shifted from peak thermal hours to clean renewable windows (Demand-Response impact).
- **Data Quality Assurance:** Monitoring API health with fallback modes (`live`, `cached`, `mock`, `stale`).

---

## 4. Technical Architecture & Monorepo Structure

The project is built as a modular, conflict-free monorepo with strict API contracts:

```
ecovolt-finder/
├── app/          # Member 1 (Frontend): React Native + Expo (Android Expo Go)
├── server/       # Member 2 (Backend): Node.js + Express + TypeScript + PostgreSQL (Prisma)
├── ml/           # Member 3 (Data & ML): Python + FastAPI + Scikit-Learn / Forecasting
└── contracts/    # Shared API definitions (OpenAPI 3.1, TypeScript types, Enums, Mock JSONs)
```

### Technology Stack:

| Layer | Technologies Used | Purpose |
|---|---|---|
| **Mobile App (Frontend)** | React Native, Expo, React Navigation, react-native-maps, Lucide Icons | Cross-platform driver & manager UI optimized for Android Expo Go |
| **Backend (API & Business Logic)** | Node.js, Express, TypeScript, Prisma ORM, PostgreSQL | REST API, RBAC, Pricing Engine, Atomic Booking Transactions, Price-Locking |
| **Data / ML Microservice** | Python 3.11, FastAPI, Pandas, NumPy, Scikit-Learn | Real-time Grid Ingestion, 24h Renewable Forecasting, Travel-Cost Model, Route Engine |
| **Grid Data & Intelligence** | Electricity Maps API / CEA India Energy Atlas + Seed Fallback | Live & historical carbon intensity and fuel mix (Solar/Wind/Hydro/Thermal) |
| **Maps & Spatial Routing** | Google Maps Platform (Directions, Distance Matrix, Geocoding) | High-accuracy routing proxied securely via backend to prevent API key leaks |
| **Local Infrastructure** | Docker, Docker Compose, PostgreSQL 16 Alpine | Containerized database and microservices for reproducible local execution |

---

## 5. Architectural Edge Cases & Robustness

| Edge Case | Solution Implemented |
|---|---|
| **Cheaper-but-farther station trap** | Ranks stations strictly by `TrueTotalCost = ChargingCost + TravelCost`. Shows honest comparison card. |
| **Different DISCOM tariffs in India** | First-class `PowerProvider` enum with independent base tariffs and manager service markups. |
| **Grid API rate-limits / Network failure** | Three-tier hybrid fallback: `Live API` $\rightarrow$ `Redis/Postgres Cache` $\rightarrow$ `Deterministic Mock Engine`. |
| **Double-booking / Connector contention** | Atomic database reservations in Prisma transaction with row-level locks and time-window overlap validation. |
| **Price volatility mid-charge** | Immutable `lockedPrice` snapshot stored on booking creation; drivers are guaranteed the quoted rate. |
| **Google Maps API key security** | Client mobile app never possesses high-privilege routing keys; all routing and distance queries are proxied server-side. |

---

## 6. Implementation & Roadmap Plan

| Phase | Milestone | Deliverables |
|---|---|---|
| **Phase 1: Foundation & Contracts** | Bootstrap & Core Infrastructure | Shared OpenAPI specs, database relational schema, Docker environments, and navigation scaffolds. |
| **Phase 2: Core Engines** | Auth, Discovery & Pricing | JWT RBAC, geo-spatial station queries, Multi-Provider Pricing Engine, and live grid ingestion. |
| **Phase 3: Intelligence & Optimization** | ML Forecasting & Booking | 24-hour renewable forecasting model, True-Cost ranking, smart-charge scheduler, and price-lock transactions. |
| **Phase 4: Telemetry & Impact** | Active Sessions & Analytics | Live charging session simulator, carbon savings counter, manager demand-charge meter, and network dashboard. |
| **Phase 5: Polish & Final Packaging** | Verification & Demo Readiness | End-to-end user flows, offline banner resilience, dark mode polish, and seed validation. |

---

## 7. Conclusion & Impact

**ecoVolt-finder** bridges the vital gap between clean energy generation and EV charging infrastructure. By providing transparent total-cost comparisons, automated green window scheduling, and operator pricing incentives, the platform accelerates India’s clean mobility transition while ensuring grid stability and driver cost savings.
