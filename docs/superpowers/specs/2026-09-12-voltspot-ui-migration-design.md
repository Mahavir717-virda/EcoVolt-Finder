# VoltSpot UI Migration into EcoVolt-Finder Design Specification

**Date:** 2026-09-12  
**Status:** Approved  
**Target Project:** `EcoVolt-Finder` (`app/` frontend)  
**Source UI:** `VoltSpot-Ev-Charging-Station-Finder---Reservation-App-Expo`  

---

## 1. Executive Summary
This design details the comprehensive migration of the frontend user interface and design system from the VoltSpot application into `EcoVolt-Finder`. The goal is to adopt 100% of VoltSpot's visual aesthetics, component architecture, animations, and Expo Router navigation while maintaining EcoVolt-Finder's existing backend (`EcoVolt-Finder/server` Express REST API) and preserving EcoVolt's green-energy metrics, dynamic pricing, and multi-role (Driver, Manager, Admin) capabilities.

---

## 2. Architecture & File Structure

### 2.1 Navigation Architecture (Expo Router)
The frontend in `EcoVolt-Finder/app` will be transitioned to an Expo Router file-based system:

```
app/
├── app/
│   ├── _layout.tsx                     # Root layout, ThemeProvider, AuthProvider, Toast
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── onboarding.tsx              # Feature walkthrough & brand introduction
│   │   ├── login.tsx                   # Driver/User login
│   │   └── signup.tsx                  # Registration screen
│   ├── (tabs)/
│   │   ├── _layout.tsx                 # Styled bottom tab bar with haptic feedback
│   │   ├── index.tsx                   # Main Map & nearby stations bottom sheet
│   │   ├── explore.tsx                 # Search & grid filter list
│   │   ├── reservations.tsx            # Booking history (Upcoming, Active, Completed)
│   │   ├── favorites.tsx               # Saved stations
│   │   └── profile.tsx                 # Profile details, EV vehicles, Eco score, Role switchers
│   ├── station/
│   │   ├── [stationId].tsx             # Station details, connector status, greenness gauge
│   │   └── reserve.tsx                 # Slot booking, time selector, payment options
│   ├── reservation/
│   │   ├── [reservationId].tsx         # Booking pass with QR code & receipt details
│   │   └── charging.tsx                # Real-time charging telemetry, circular gauge, stop button
│   └── modal/
│       ├── filters.tsx                 # Connector types, kW speed, price filter
│       ├── navigation.tsx              # External / in-app turn-by-turn navigation modal
│       └── upgrade.tsx                 # EcoVolt Green Club / Premium plan modal
├── components/
│   ├── ui/                             # Button, Card, Badge, Input, Loader
│   ├── animations/                     # FadeIn, ScaleIn, SlideIn, PulseAnimation, SkeletonLoader
│   ├── common/                         # Header, EmptyState, ErrorState
│   ├── station/                        # StationCard, ChargerCard
│   └── map/                            # DirectionsMap, WebViewMap / Native Map
├── constants/
│   ├── colors.ts                       # VoltSpot color palette tokens
│   ├── theme.ts                        # Light / Dark theme configurations
│   ├── chargerTypes.ts                 # Connector definitions (CCS2, Type 2, CHAdeMO)
│   └── routes.ts                       # App navigation route constants
├── styles/
│   ├── spacing.ts                      # Spacing and layout metrics
│   └── theme.ts                        # Typography and shadow styles
├── services/
│   ├── api.ts                          # Express REST API client (`/api/v1`)
│   ├── adapters.ts                     # Data mapping between EcoVolt backend and VoltSpot UI
│   ├── auth.service.ts                 # JWT login/register/logout
│   ├── stations.service.ts             # Station search, details, and live greenness
│   ├── reservations.service.ts         # Booking creation, status, and cancellation
│   ├── charging.service.ts             # Live charging session telemetry
│   └── users.service.ts                # Profile and vehicle management
├── hooks/
│   ├── useAuth.tsx                     # Authentication state & session manager
│   ├── useStations.ts                  # Station queries & geo-filtering
│   ├── useReservations.ts              # Active & past bookings state
│   └── useChargers.ts                  # Charger availability
└── assets/                             # Icons, logos, and illustration assets
```

### 2.2 Package & Build Configuration
- **Entry point**: `"main": "expo-router/entry"` in `app/package.json`.
- **Dependencies**: Add `expo-router`, `@expo/vector-icons`, `react-native-reanimated`, `expo-haptics`, `expo-image`, `expo-symbols`, `react-native-webview` to match VoltSpot requirements.
- **Expo Plugins**: Ensure `expo-router` is included in `app.json` plugins.

---

## 3. Visual Design System & Components

### 3.1 Color Palette & Theme Tokens
- **Brand Primary**: Emerald Green (`#00D09E` / `#10B981`) representing clean EV power.
- **Dark Mode Surfaces**: Deep Navy `#0F172A`, Surface Slate `#1E293B`, Borders `#334155`.
- **Accents**: Electric Cyan (`#06B6D4`), Hyper Blue (`#3B82F6`), Warning Amber (`#F59E0B`), Error Red (`#EF4444`).
- **Typography**: System font hierarchy with standardized line heights and weights (Regular, Medium, SemiBold, Bold).

### 3.2 Component Library
1. **Core UI (`components/ui/`)**:
   - `Button`: Multiple visual variants (`primary`, `secondary`, `outline`, `ghost`, `danger`) with loading indicators and haptic response.
   - `Card`: Configurable elevations, borders, and rounded corners.
   - `Badge`: Status tags for connector types, charger speeds, and EcoVolt green energy indicators.
   - `Input`: Text fields with leading/trailing icons, error text, and focus animations.
   - `Loader` & `SkeletonLoader`: Shimmer loading states for cards and lists.
2. **Micro-Animations (`components/animations/`)**:
   - Smooth staggered entrances for station lists.
   - Pulsing glow effects on active station pins and live charging sessions.
3. **Station & Charging Cards (`components/station/`)**:
   - `StationCard`: Distance, rating, pricing, available connector count, and EcoVolt green score badge.
   - `ChargerCard`: Real-time port status (Available, Busy, Reserved, Offline) with power kW and per-kWh rates.

---

## 4. Backend Integration & Data Adapters

### 4.1 Connecting to EcoVolt Express API
All network requests in the frontend will interface with `EcoVolt-Finder/server` (default `http://localhost:4000/api/v1` or `EXPO_PUBLIC_API_URL`):

- **Auth Service**: Calls `POST /api/v1/auth/login` and `POST /api/v1/auth/register`, storing the JWT securely in `expo-secure-store`.
- **Stations Service**: Calls `GET /api/v1/stations` with optional query params (`lat`, `lng`, `radius`, `connector_type`).
- **Bookings Service**: Calls `POST /api/v1/bookings` (slot reservation) and `GET /api/v1/bookings` (user reservations).
- **Sessions Service**: Calls `POST /api/v1/sessions` (start session) and `GET /api/v1/sessions/active` (live charge telemetry).

### 4.2 Adapter Layer (`services/adapters.ts`)
Converts EcoVolt backend records into VoltSpot UI models:
- Normalizes property names (`station_id` ⇄ `id`, `station_name` ⇄ `name`).
- Formats connector types and pricing strings.
- Injects EcoVolt green energy scores (`greenness_score`, `co2_saved_kg`) into station and session cards.

### 4.3 Offline & Mock Fallback Resilience
If the backend is not running or the network drops, services automatically load initial data from EcoVolt's local mock fixtures (`app/src/api/mocks/data/`) to ensure the application remains interactive and crash-free during demos and development.

---

## 5. EcoVolt-Specific Extensions

### 5.1 Greenness Rating & Smart Energy
- Integrated into `StationCard` and `[stationId].tsx`: Displays renewable energy percentage (e.g., `🌿 95% Solar/Wind`).
- Live charging session screen (`charging.tsx`): Displays cumulative CO₂ saved in kg alongside kWh charged.

### 5.2 Multi-Role Portal Links (Manager & Admin)
- In the VoltSpot `profile.tsx` screen, a dedicated "Workspace Access" card provides links for users with appropriate roles:
  - **Station Manager Portal**: Manage station hardware, review occupancy, and set dynamic pricing rules.
  - **Network Admin Console**: Oversee network-wide telemetry, user permissions, and charging logs.

---

## 6. Testing & Verification Plan

1. **Static Analysis & TypeScript Compilation**:
   - Run `npm run ts:check` (or `tsc --noEmit`) to verify that all routes, props, and service calls are type-safe.
2. **Navigation Flow Verification**:
   - Verify Onboarding → Login → Main Tabs (`index`, `explore`, `reservations`, `favorites`, `profile`).
   - Verify Station Details → Reservation (`reserve.tsx`) → Receipt (`[reservationId].tsx`) → Active Charging Session (`charging.tsx`).
   - Verify Filter Modal and Navigation Modal open and dismiss smoothly.
3. **API & Fallback Verification**:
   - Verify that station and reservation queries succeed against the Express backend or fallback mock data.
