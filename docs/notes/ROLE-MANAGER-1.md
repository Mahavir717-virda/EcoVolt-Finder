# ROLE-MANAGER-1: Analysis & Implementation Plan

## 1. Current State Analysis

### What Already Exists and Can Be Reused As-Is
- **Contracts**: Data shapes for `StationSummary`, `ConnectorInfo`, `PriceQuote`, `Session`, `Booking` are defined in `contracts/types.ts` and `contracts/openapi.node.yaml`. Enums for `PowerProvider`, `Role`, `ConnectorType`, etc., are available.
- **Design System & Components**: `app/src/theme/tokens.ts` (M1-C2-REVISED system) provides colors, spacing, radii, etc. A rich set of reusable components like `Card`, `Button`, `Chip`, `LinearProgress`, `SkeletonCard`, `EmptyState`, `Input`, `SelectableRow`, `CircularGauge`, `StationCard` exist in `app/src/components` and should be reused.
- **Auth Middleware**: `requireAuth`, `requireRole`, and `requireStationOwnership` middlewares already exist in `server/src/middleware/auth.middleware.ts`.
- **Base UI Screens**: Initial screens `ManagerDashboardScreen`, `PricingControlsScreen`, and `StationFormScreen` exist in `app/src/screens/manager`. They are visually aligned with the theme but are wired to stub/non-existent backend logic.

### What Exists But Needs Extending
- **Server Routers & Controllers**: `stations.router.ts`, `pricing.router.ts`, `sessions.router.ts`, and `bookings.router.ts` have placeholder/manager routes (`GET /manager/active`, `GET /manager/upcoming`). We need to implement the actual business logic in their respective services.
- **OpenAPI Spec**: The manager-specific endpoints (e.g., `GET /manager/stations`, `POST /manager/stations`) are either missing from `openapi.node.yaml` or incomplete, and need documentation.
- **App Screens**: The `ManagerDashboardScreen`, `PricingControlsScreen`, and `StationFormScreen` need to correctly pass and handle real data, validation, and missing states. 

### What's Completely Missing
- **Database Logic**: The actual DB queries for managers to fetch their own stations, active sessions, and upcoming bookings are missing.
- **Booking Oversight Screen**: A new screen `BookingOversightScreen.tsx` is completely missing. It needs to list upcoming reservations, no-shows, and provide a manual override to free a stuck connector.
- **Duplicate Station Check**: Logic to check nearby geocoded location to warn on duplicate station creation.
- **Pricing Floor Logic**: Hard floor so final price can never go negative in the pricing configuration.
- **Force-Stop & Dispute**: The UI/API for force-stopping a session (with a reason) and flagging a session as disputed.

## 2. Feature Implementation Plan

### 1. Dashboard
- **Plan**: Implement `GET /manager/stations` and `GET /manager/sessions` on the server to serve real data to `ManagerDashboardScreen`.
- **Endpoints to modify**: `server/src/modules/stations/stations.controller.ts`, `server/src/modules/sessions/sessions.controller.ts`.
- **Edge Cases**: 
  - **#16 (Demand-charge/peak stacking)**: Demand-charge risk meter will reflect `currentDemandKw` and `maxTransformerKw` accurately.

### 2. Station Management
- **Plan**: Implement `POST /manager/stations` and `PATCH /manager/stations/:id` in `stations.service.ts` with real DB calls. Implement duplicate check based on Geocoded location (distance check).
- **New/Modified Files**: `server/src/modules/stations/stations.service.ts`, `app/src/screens/manager/StationFormScreen.tsx`.
- **Edge Cases**:
  - **#22 (Manager edits another's station)**: Handled by `requireRole` and `requireStationOwnership` middleware.
  - **Duplicate Warning (implied)**: Warn if a station exists nearby.

### 3. Connector Management
- **Plan**: Implement `PATCH /stations/:id/connectors/:connectorType/status`. Add checks to block reduction in available count if sessions are active.
- **New/Modified Files**: `server/src/modules/stations/stations.service.ts`.
- **Edge Cases**:
  - **#15 (Double-booking a connector)**: Ensure capacity isn't artificially reduced below the active session count.
  - **#22 (Ownership)**: Handled by middleware.

### 4. Pricing Control
- **Plan**: Implement `PUT /pricing/station/:id`. Enforce a hard price floor (min price > ₹0) so final price never goes negative regardless of large ToU discount.
- **New/Modified Files**: `server/src/modules/pricing/pricing.service.ts`, `app/src/screens/manager/PricingControlsScreen.tsx`.
- **Edge Cases**:
  - **#2 (Different providers, different pricing)**: Base tariff lookup based on provider.
  - **#14 (No ToU tariff / Estimate)**: Model proxy if needed.
  - **Price Floor (implied)**: Hard floor holds under large discounts.

### 5. Live Sessions
- **Plan**: Implement `POST /sessions/:id/force-stop` (requires reason body) and `POST /sessions/:id/dispute`. Update UI in Dashboard to include modal prompts for reason.
- **New/Modified Files**: `server/src/modules/sessions/sessions.service.ts`, `server/src/modules/sessions/sessions.controller.ts`, `app/src/screens/manager/ManagerDashboardScreen.tsx`.
- **Edge Cases**:
  - **#17 (Price changes mid-booking)**: Force stop bills at the `lockedPrice`.
  - **#22 (Ownership)**: Guarded via middleware.

### 6. Booking Oversight
- **Plan**: Add `BookingOversightScreen.tsx`. Implement `GET /manager/upcoming` and `POST /bookings/:id/override-stuck` in `bookings.service.ts`.
- **New/Modified Files**: `app/src/screens/manager/BookingOversightScreen.tsx`, `server/src/modules/bookings/bookings.service.ts`.
- **Edge Cases**:
  - **#15 (Double-booking)**: Manual override frees the slot correctly in the slot matrix.
  - **#22 (Ownership)**: Guarded via middleware.

*(Note: Edge cases #39, #40, #41, #44, #45, #46, #47, #48, #49, #52, #61 were referenced in the prompt but are not present in the provided `EDGE_CASES.md`. We assume they map to the specific acceptance criteria like duplicate-station warning, force-stop reason, and price floors, which are explicitly addressed in the plan.)*
