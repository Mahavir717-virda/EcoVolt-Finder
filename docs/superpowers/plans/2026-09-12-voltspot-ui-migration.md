# VoltSpot UI Migration into EcoVolt-Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely replace the `EcoVolt-Finder/app` frontend with the VoltSpot design system, animations, components, and Expo Router navigation while connecting to the existing EcoVolt Express backend.

**Architecture:** Adopt VoltSpot's Expo Router structure (`app/(tabs)`, `app/(auth)`, `app/station`, `app/reservation`, `app/modal`) and design system (`components/ui`, `animations`, `styles`, `constants`). Replace direct Supabase calls with an EcoVolt REST API adapter layer that queries `EcoVolt-Finder/server` (`/api/v1`) with offline mock fallback. Integrate EcoVolt's green grid metrics and provide Station Manager & Network Admin workspace links in Profile.

**Tech Stack:** React Native 0.76.9, Expo 52, Expo Router 4, React Native Reanimated, Expo Vector Icons, Expo Haptics, Expo Image, TypeScript.

**Spec:** [`docs/superpowers/specs/2026-09-12-voltspot-ui-migration-design.md`](file:///c:/Users/Deep%20Pathak/Desktop/HackOUT/EcoVolt-Finder/docs/superpowers/specs/2026-09-12-voltspot-ui-migration-design.md)

## Global Constraints
- Target workspace directory: `c:\Users\Deep Pathak\Desktop\HackOUT\EcoVolt-Finder\app`.
- Source UI directory: `c:\Users\Deep Pathak\Desktop\HackOUT\VoltSpot-Ev-Charging-Station-Finder---Reservation-App-Expo`.
- Entrypoint: `"main": "expo-router/entry"` in `app/package.json`.
- EcoVolt Express Backend: `http://localhost:4000/api/v1` (with fallback mock fixtures in `src/api/mocks/data/`).
- TypeScript strictness: All new and migrated files must compile cleanly with `tsc --noEmit`.

---

### Task 1: Package Dependencies & Expo Router Configuration

**Files:**
- Modify: `app/package.json`
- Modify: `app/app.json`
- Modify: `app/tsconfig.json`

**Interfaces:**
- Consumes: Dependencies from `VoltSpot/package.json`.
- Produces: Working Expo Router entrypoint and package resolution.

- [ ] **Step 1: Update `app/package.json` with Expo Router entry & dependencies**
  Ensure dependencies match VoltSpot:
  - `"main": "expo-router/entry"`
  - Add `@expo/vector-icons`, `expo-router`, `react-native-reanimated`, `expo-haptics`, `expo-image`, `expo-symbols`, `react-native-webview`.
- [ ] **Step 2: Update `app/app.json` for Expo Router**
  Add `"scheme": "ecovolt"`, `"plugins": ["expo-router"]`.
- [ ] **Step 3: Update `app/tsconfig.json`**
  Add path aliases (`"@/*": ["./*"]`).
- [ ] **Step 4: Verify package setup**
  Run `npm install` inside `app` if needed, check integrity.
- [ ] **Step 5: Commit changes**
  `git commit -m "build: configure Expo Router and dependencies for VoltSpot UI"`

---

### Task 2: Port Design Tokens, Styles, Constants, and Assets

**Files:**
- Create/Copy: `app/constants/colors.ts`
- Create/Copy: `app/constants/theme.ts`
- Create/Copy: `app/constants/chargerTypes.ts`
- Create/Copy: `app/constants/plans.ts`
- Create/Copy: `app/constants/routes.ts`
- Create/Copy: `app/styles/spacing.ts`
- Create/Copy: `app/styles/theme.ts`
- Copy: `app/assets/images/*`

**Interfaces:**
- Consumes: VoltSpot design tokens.
- Produces: `colors`, `spacing`, `theme`, `chargerTypes` imported across all components.

- [ ] **Step 1: Copy and verify `constants/` from VoltSpot**
  Copy `colors.ts`, `theme.ts`, `chargerTypes.ts`, `plans.ts`, `routes.ts`.
- [ ] **Step 2: Copy and verify `styles/` from VoltSpot**
  Copy `spacing.ts`, `theme.ts`.
- [ ] **Step 3: Copy asset images from VoltSpot to `app/assets/images/`**
- [ ] **Step 4: Verify imports compile**
  Run `npx tsc --noEmit constants/colors.ts styles/theme.ts`.
- [ ] **Step 5: Commit**
  `git commit -m "feat(ui): add VoltSpot design tokens, constants, styles, and assets"`

---

### Task 3: Port Reusable UI, Animation, Map, and Station Components

**Files:**
- Create: `app/components/ui/` (`Button.tsx`, `Card.tsx`, `Badge.tsx`, `Input.tsx`, `Loader.tsx`, `collapsible.tsx`, `icon-symbol.tsx`, `index.ts`)
- Create: `app/components/animations/` (`AnimatedButton.tsx`, `FadeIn.tsx`, `PulseAnimation.tsx`, `ScaleIn.tsx`, `SkeletonLoader.tsx`, `SlideIn.tsx`, `StaggeredList.tsx`, `index.ts`)
- Create: `app/components/common/` (`Header.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `index.ts`)
- Create: `app/components/station/` (`StationCard.tsx`, `ChargerCard.tsx`, `index.ts`)
- Create: `app/components/map/` (`DirectionsMap.tsx`, `WebViewMap.tsx`, `index.ts`)
- Create: `app/components/themed-text.tsx`, `app/components/themed-view.tsx`, `app/components/haptic-tab.tsx`, `app/components/external-link.tsx`

**Interfaces:**
- Consumes: `constants/colors.ts`, `styles/spacing.ts`.
- Produces: Component library used by Expo Router screens.

- [ ] **Step 1: Port `components/ui/` library with full prop types**
- [ ] **Step 2: Port `components/animations/` library**
- [ ] **Step 3: Port `components/common/` and helper components**
- [ ] **Step 4: Port `components/station/` and `components/map/` components**
- [ ] **Step 5: Enhance `StationCard.tsx` with EcoVolt Green Energy score badge**
- [ ] **Step 6: Verify component compilation**
  Run `npx tsc --noEmit components/**/*.tsx`.
- [ ] **Step 7: Commit**
  `git commit -m "feat(ui): port VoltSpot UI, animation, map, and station components"`

---

### Task 4: EcoVolt REST API Client, Data Adapters, and Hooks

**Files:**
- Create: `app/services/api.ts` (Express REST client with token auth)
- Create: `app/services/adapters.ts` (Model normalizers: stations, chargers, bookings, sessions)
- Create: `app/services/stations.service.ts`
- Create: `app/services/reservations.service.ts`
- Create: `app/services/chargers.service.ts`
- Create: `app/services/users.service.ts`
- Create: `app/hooks/useAuth.tsx`
- Create: `app/hooks/useStations.ts`
- Create: `app/hooks/useReservations.ts`
- Create: `app/hooks/useChargers.ts`
- Create: `app/hooks/useFavorites.ts`

**Interfaces:**
- Consumes: EcoVolt Express API (`/api/v1`) & EcoVolt mock datasets in `src/api/mocks/data/`.
- Produces: Seamless hooks returning typed stations, bookings, and session state.

- [ ] **Step 1: Implement `services/api.ts` and `services/adapters.ts`**
  Include automatic fallback to local mock JSON when backend is offline.
- [ ] **Step 2: Implement `services/*.service.ts`**
  Port methods (`getStations`, `getStationById`, `createReservation`, `getUserReservations`, `updateReservation`, `getCurrentUser`).
- [ ] **Step 3: Implement `hooks/useAuth.tsx`**
  Support driver login, registration, role state, and token persistence in `expo-secure-store`.
- [ ] **Step 4: Implement `hooks/useStations.ts`, `useReservations.ts`, `useChargers.ts`**
- [ ] **Step 5: Run unit tests/type verification**
  Run `npx tsc --noEmit services/*.ts hooks/*.ts*`.
- [ ] **Step 6: Commit**
  `git commit -m "feat(api): implement EcoVolt REST client, adapters, and data hooks"`

---

### Task 5: Expo Router Screens — Root Layout & Authentication

**Files:**
- Create: `app/app/_layout.tsx`
- Create: `app/app/(auth)/_layout.tsx`
- Create: `app/app/(auth)/onboarding.tsx`
- Create: `app/app/(auth)/login.tsx`
- Create: `app/app/(auth)/signup.tsx`

**Interfaces:**
- Consumes: `hooks/useAuth.tsx`, `components/ui/`, `constants/colors.ts`.
- Produces: Initial launch flow, onboarding presentation, and login/signup navigation.

- [ ] **Step 1: Create `app/app/_layout.tsx`**
  Setup `ThemeProvider`, `AuthProvider`, and Expo Router Stack definitions.
- [ ] **Step 2: Create `app/app/(auth)/_layout.tsx`**
- [ ] **Step 3: Port `app/app/(auth)/onboarding.tsx`**
  Feature carousel, animations, and "Get Started" navigation.
- [ ] **Step 4: Port `app/app/(auth)/login.tsx` and `app/app/(auth)/signup.tsx`**
  Connect form submission to `useAuth().login` and `signup`.
- [ ] **Step 5: Verify auth routes compilation**
  Run `npx tsc --noEmit app/(auth)/*.tsx`.
- [ ] **Step 6: Commit**
  `git commit -m "feat(routes): implement root layout and auth onboarding screens"`

---

### Task 6: Expo Router Screens — Main Tabs (Map, Explore, Bookings, Profile)

**Files:**
- Create: `app/app/(tabs)/_layout.tsx`
- Create: `app/app/(tabs)/index.tsx` (Home Map & Station List Bottom Sheet)
- Create: `app/app/(tabs)/explore.tsx` (Search & Filter List)
- Create: `app/app/(tabs)/reservations.tsx` (Active, Upcoming & Past Bookings)
- Create: `app/app/(tabs)/favorites.tsx` (Saved Stations)
- Create: `app/app/(tabs)/profile.tsx` (Profile, Vehicles, Eco-Stats & Manager/Admin workspace link)

**Interfaces:**
- Consumes: `components/station/`, `components/map/`, `hooks/useStations`, `hooks/useReservations`.
- Produces: Fully interactive 5-tab driver experience.

- [ ] **Step 1: Create `app/app/(tabs)/_layout.tsx`**
  Custom styled bottom tab navigation bar with icons and haptic tab press.
- [ ] **Step 2: Port `app/app/(tabs)/index.tsx`**
  Interactive map with station markers, bottom sheet slider, and fast charger filtering.
- [ ] **Step 3: Port `app/app/(tabs)/explore.tsx` and `favorites.tsx`**
- [ ] **Step 4: Port `app/app/(tabs)/reservations.tsx`**
  Tabbed view (Active, Upcoming, History) with cancel action and QR code view.
- [ ] **Step 5: Port `app/app/(tabs)/profile.tsx`**
  Add user vehicle management and "Workspace Portals" (Station Manager & Network Admin links).
- [ ] **Step 6: Verify tabs compilation**
  Run `npx tsc --noEmit app/(tabs)/*.tsx`.
- [ ] **Step 7: Commit**
  `git commit -m "feat(routes): implement main bottom tabs navigation and screens"`

---

### Task 7: Expo Router Screens — Station Detail, Booking, Live Charging & Modals

**Files:**
- Create: `app/app/station/[stationId].tsx`
- Create: `app/app/station/reserve.tsx`
- Create: `app/app/reservation/[reservationId].tsx`
- Create: `app/app/reservation/charging.tsx`
- Create: `app/app/modal/filters.tsx`
- Create: `app/app/modal/navigation.tsx`
- Create: `app/app/modal/upgrade.tsx`

**Interfaces:**
- Consumes: `services/reservations.service.ts`, `services/charging.service.ts`, `components/ui/`.
- Produces: Complete end-to-end driver reservation and charging lifecycle.

- [ ] **Step 1: Port `app/app/station/[stationId].tsx`**
  Station photo header, ratings, greenness gauge, connector list, and "Book Slot" CTA.
- [ ] **Step 2: Port `app/app/station/reserve.tsx`**
  Date picker, time slot selector, dynamic price calculation, and payment selection.
- [ ] **Step 3: Port `app/app/reservation/[reservationId].tsx`**
  Booking confirmation ticket, QR code check-in pass, and directions button.
- [ ] **Step 4: Port `app/app/reservation/charging.tsx`**
  Live charging telemetry: animated circular progress gauge, power kW delivered, cost counter, CO₂ saved indicator, and stop button.
- [ ] **Step 5: Port modals in `app/app/modal/`** (`filters.tsx`, `navigation.tsx`, `upgrade.tsx`).
- [ ] **Step 6: Verify station & reservation screens compilation**
  Run `npx tsc --noEmit app/station/*.tsx app/reservation/*.tsx app/modal/*.tsx`.
- [ ] **Step 7: Commit**
  `git commit -m "feat(routes): implement station booking, live charging, and modal flows"`

---

### Task 8: End-to-End Verification & Quality Review

**Files:**
- Review all migrated files across `app/app/`, `app/components/`, `app/services/`.

- [ ] **Step 1: Run full TypeScript check**
  Run `npx tsc --noEmit` from `app/`. Fix any type or path mismatches.
- [ ] **Step 2: Verify all assets & images exist and load correctly**
- [ ] **Step 3: Verify backend integration and mock fallback mechanism**
- [ ] **Step 4: Run Expo pre-flight check**
  Ensure Metro bundler can bundle entry without errors.
- [ ] **Step 5: Final commit and create walkthrough artifact**
  `git commit -m "chore: complete VoltSpot UI migration into EcoVolt-Finder"`
