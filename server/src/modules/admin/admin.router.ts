import { Router } from 'express';
import { AdminController } from './admin.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Strictly enforce Admin role check server-side
router.use(requireAuth);
router.use(requireRole(Role.admin));

// 1. Network-Wide Overview & Telemetry
router.get('/overview', AdminController.getNetworkOverview);

// 2. Station Registry (CRUD: Browse, Add, Status update, Delete)
router.get('/stations', AdminController.getStationRegistry);
router.post('/stations', AdminController.createStation);
router.put('/stations/:id/status', AdminController.updateStationStatus);
router.delete('/stations/:id', AdminController.deleteStation);

// 3. User Governance & Role Management (CRUD: Browse, Add, Role/Status update, Delete)
router.get('/users', AdminController.getUsersList);
router.post('/users', AdminController.createUser);
router.put('/users/:id/governance', AdminController.updateUserRoleAndStatus);
router.delete('/users/:id', AdminController.deleteUser);

// 4. Grid Zones & Data Quality
router.get('/zones', AdminController.getGridZones);

// 5. System Health & Ops Telemetry
router.get('/health', AdminController.getSystemHealth);

// 6. Financial Aggregates (Read-Only)
router.get('/financials', AdminController.getFinancialAggregates);

// 7. Platform Configuration
router.get('/config', AdminController.getPlatformConfig);

// 8. Permanent Audit Log (Read-Only, Append-Only)
router.get('/audit-log', AdminController.getAuditTrail);

export const adminRouter = router;
