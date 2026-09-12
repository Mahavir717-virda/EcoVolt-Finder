# ROLE-ADMIN Analysis & Findings

## 1. Existing Data Shapes & Contracts
**Files Analyzed:**
- `/contracts/types.ts`
- `/contracts/enums.ts`
- `/contracts/openapi.node.yaml`
- `/contracts/openapi.ml.yaml`

**Findings:**
- `Role` enum correctly includes `admin`.
- `GreennessBand` and `DataQuality` are defined to tag grid data.
- The `openapi.ml.yaml` correctly exposes endpoints for grid data (`/grid/live`, `/grid/forecast`), classification (`/classify`), smart-charge window estimation (`/estimate/windows`), routing, and recommendations.
- Missing:
  - `AuditLog` shape for tracking admin actions.
  - `User` status field (for suspension).
  - Explicit platform-level deactivation status for `Station` (currently only has `isActive`).

## 2. Server Infrastructure
**Files Analyzed:**
- `/server/src/middleware/auth.middleware.ts`
- `/server/prisma/schema.prisma`

**Findings:**
- `requireRole` middleware is fully implemented and correctly checks against `req.user.role`. This will easily allow gating endpoints with `requireRole(Role.admin)`.
- `requireStationOwnership` is built-in and already has a bypass for `Role.admin`, which aligns with the "Admin has visibility" requirement, but we must strictly ensure that Admin mutation routes do not use this to modify station config (as per the "never direct control" rule).
- `schema.prisma` is missing several Admin-specific constructs:
  - Needs `status` (active/suspended) and `suspendReason` on the `User` model.
  - Needs an `AuditLog` model to track role changes, suspensions, and station deactivations.
  - Needs a `platformStatus` or equivalent flag on `Station` to distinguish an admin takedown from a manager turning it off.

## 3. App UI & Theming
**Files Analyzed:**
- App directory structure (`/app/src/screens/admin`, `/app/src/navigation`)

**Findings:**
- The `/app/src/screens/admin` folder has only a placeholder `NetworkDashboardScreen.tsx`.
- Need to build a comprehensive Admin navigation stack mirroring the driver/manager patterns.
- Existing components (`SkeletonCard`, `LinearProgress`, `Chip`, `EmptyState`) from the component kit can be heavily reused across the new Admin dashboard, tables, and detail screens.

## 4. Edge Cases Addressed
- **#3, #6, #12, #13, #21 (Grid/Greenness):** Handled entirely via read-only consumption of the ML service.
- **#22 (Manager edits):** Admin will explicitly not have an endpoint to edit stations; they can only read and flag/deactivate.
- **#25, #26 (Google Maps API):** Ops dashboard will track quotas securely.
- **New cases (#56, #57, etc.):** Anomaly tracking, fraud detection, and Razorpay webhook health will be surfaced in the Ops/Health module and Financial module.

## 5. Implementation Plan

### Schema Updates
- Update `User` model: add `status String @default("active")`, `suspendReason String?`.
- Update `Station` model: add `platformStatus String @default("active")`.
- Create `AuditLog` model: `action String`, `targetId String`, `adminId String`, `reason String?`.

### New Admin Modules (/server/src/modules/admin)
1. **`Network Overview` & `Zone Drilldown`:** `GET /admin/network/overview`, `GET /admin/network/zones/:id`
2. **`Operator Oversight` & `Station Governance`:** `GET /admin/operators`, `GET /admin/stations`, `PATCH /admin/stations/:id/status` (flag/deactivate only)
3. **`Data Quality Monitoring`:** `GET /admin/data-quality` (aggregating ML tags)
4. **`Network Analytics` & `Financial Oversight`:** `GET /admin/analytics`, `GET /admin/finance`
5. **`User Management`:** `GET /admin/users`, `PATCH /admin/users/:id/role`, `PATCH /admin/users/:id/suspend`
6. **`System Health`:** `GET /admin/health` (Google API quotas, Webhook health, Job status)
7. **`Audit Log`:** `GET /admin/audit-logs`

### Admin App Stack (/app/src/screens/admin)
- `AdminDashboardScreen`
- `ZoneDrilldownScreen`
- `OperatorListScreen` & `OperatorDetailScreen`
- `DataQualityScreen`
- `AdminAnalyticsScreen` (reusing manager charting)
- `UserManagementScreen`
- `StationRegistryScreen`
- `SystemHealthScreen`
- `AuditLogScreen`
- `PlatformConfigScreen`
