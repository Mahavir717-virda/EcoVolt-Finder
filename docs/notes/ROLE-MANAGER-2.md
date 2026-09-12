# ROLE-MANAGER-2: Analytics & Governance Plan

## 1. Review of Task 1
Task 1 successfully established:
- **Manager Dashboard** with live metrics.
- **Station & Connector Management** endpoints with RBAC (manager role + station ownership).
- **Pricing Controls** via `PUT /pricing/station/:stationId`.
- **Live Sessions & Booking Oversight**, including actions to forcefully stop a session or flag a session as disputed (which updates `disputeReason` on the `Session` model).
- **Security Pattern**: `requireAuth`, `requireRole(Role.manager)`, and `requireStationOwnership` middleware/checks are consistently applied.

## 2. Razorpay Integration Check
- After searching the `/server` directory for `razorpay`, **no existing Razorpay integration was found**.
- **Action**: The "Disputes & Refunds" feature will build a mocked payment/refund service that simulates network delays and uses an internal webhook/callback pattern to simulate real-world asynchronous webhook confirmations (changing state from `processing` to `refunded`).

## 3. Plan for Features

### A. Analytics & Reporting
- **Backend**: Add a new endpoint `GET /manager/analytics` that aggregates:
  - Utilization over time (e.g., sessions per day for the last 7 days).
  - Revenue trends.
  - Renewable share achieved vs. grid average.
  - Average price realized.
  - Demand-charge exposure over time (tracking peak load).
  - Add `GET /manager/analytics/export` to generate and download a CSV report.
- **Frontend**: Fully implement `ManagerAnalyticsScreen.tsx` using charts (or simple bar visualizations built with the existing UI components) to display these metrics and a "Download CSV" button.

### B. Demand-Charge Management
- **Schema Updates**: Add `demandChargeCapKw` (Float, default 150.0) to `Station` to allow configurable caps.
- **Backend**:
  - Expose a config endpoint `PATCH /stations/:id/demand-cap` to update this limit.
  - In `sessions.service.ts` or `bookings.service.ts`, implement an alert logic: if concurrent load approaches 80% of `demandChargeCapKw`, trigger a "demand-charge risk" notification for the manager.
- **Frontend**: Add a "Peak Concurrency & Demand" view in the Manager Analytics screen to view real-time concurrent load vs. the configured cap.

### C. Disputes & Refunds
- **Schema Updates**:
  - Add `refundStatus` (String, default "none") and `resolutionNotes` (String?) to the `Session` model.
- **Backend**:
  - `GET /sessions/manager/disputes` to list sessions where `disputeReason` is not null.
  - `POST /sessions/:id/refund` to initiate a refund (updates status to `processing` and sets a timeout to mock a webhook callback which later updates to `refunded`).
  - `POST /sessions/:id/resolve` to add `resolutionNotes`.
- **Frontend**: Create `DisputesScreen.tsx` (accessible via Manager Dashboard or Settings) to list disputed sessions, showing the optimistic "processing" state until the mock webhook fires.

### D. Notifications
- **Backend**: 
  - Enhance `NotificationsService` (or `notification_logs` table) to support manager-specific alerts:
    - Station offline / Connector fault.
    - Demand-charge risk (triggered when load > 80% capacity).
    - Payment failure / Refund completed.
- **Frontend**: Add a simple notification bell/dropdown or `NotificationsScreen.tsx` in the manager stack to view these alerts.

### E. Multi-Station / Team
- Task 1 already enforces multi-station scoping cleanly via `operatorId`.
- **Scope Note**: Sub-staff and limited-permission roles (e.g., view-only staff) are **out of scope** for this hackathon to maintain velocity, but the RBAC pattern easily allows adding a `Role.staff` enum in the future.

### F. Profile & Settings
- **Schema Updates**: Add `payoutBankDetails` (Json?) and `notificationPrefs` (Json?) to the `Operator` model.
- **Backend**: Add `GET /manager/profile` and `PATCH /manager/profile` to manage these settings.
- **Frontend**: Update `ProfileScreen.tsx` (or a specific manager settings view) to edit business details, mocked Razorpay settlement bank accounts, and toggle notification preferences.

## 4. Edge Cases Handled
- **#16 (Demand Charge Risks)**: Handled via the configured `demandChargeCapKw` and real-time concurrency monitoring/alerting.
- **#23 (No-Shows)**: Disputed sessions logic supports marking no-shows as disputes and issuing partial refunds if applicable.
- **R9 / R19 (Razorpay Webhooks)**: Refund flows strictly avoid optimistic success claims; the UI remains in `processing` until the simulated webhook confirms completion.
