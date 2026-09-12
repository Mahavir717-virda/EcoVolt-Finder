import { Router } from 'express';
import { AdminController } from './admin.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

export const adminRouter = Router();

// All routes require authentication and ADMIN role
adminRouter.use(requireAuth, requireRole(Role.admin));

// 1. Network Overview & Zone Drilldown
adminRouter.get('/network/overview', AdminController.getNetworkOverview);
adminRouter.get('/network/zones/:id', AdminController.getZoneDrilldown);

// 2. Operator Oversight
adminRouter.get('/operators', AdminController.getOperators);

// 3. User & Role Management
adminRouter.get('/users', AdminController.getUsers);
adminRouter.patch('/users/:id/role', AdminController.updateUserRole);
adminRouter.patch('/users/:id/suspend', AdminController.suspendUser);

// 4. Station Registry Governance
adminRouter.get('/stations', AdminController.getStations);
adminRouter.patch('/stations/:id/status', AdminController.setStationPlatformStatus);

// 5. Data Quality Monitoring
adminRouter.get('/data-quality', AdminController.getDataQuality);

// 6. System Health / Ops
adminRouter.get('/health', AdminController.getSystemHealth);

// 7. Network Analytics
adminRouter.get('/analytics', AdminController.getPlatformAnalytics);

// 8. Financial Oversight
adminRouter.get('/finance', AdminController.getFinancialOversight);

// 9. Audit Log
adminRouter.get('/audit-logs', AdminController.getAuditLogs);
