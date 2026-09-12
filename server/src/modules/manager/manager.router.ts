import { Router } from 'express';
import { ManagerController } from './manager.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);
router.use(requireRole(Role.manager, Role.admin));

// Operator Profile & Payout Bank Details
router.get('/profile', ManagerController.getProfile);
router.patch('/profile', ManagerController.updateProfile);
router.put('/profile', ManagerController.updateProfile);

// Performance Analytics Dashboard
router.get('/analytics', ManagerController.getAnalytics);

// Station Onboarding & Maintenance
router.get('/stations', ManagerController.getStations);
router.post('/stations', ManagerController.createStation);
router.put('/connectors/:id/status', ManagerController.updateConnectorStatus);

// Pricing Rules & ToU Controls
router.get('/pricing', ManagerController.getPricing);
router.post('/pricing', ManagerController.createPricingRule);
router.put('/pricing/:stationId', ManagerController.updatePricingRule);
router.delete('/pricing/:id', ManagerController.deletePricingRule);

// Sessions & Live Controls
router.get('/sessions', ManagerController.getSessions);
router.post('/sessions/:id/force-stop', ManagerController.forceStopSession);
router.post('/sessions/:id/refund', ManagerController.refundSession);

// Bookings & Stuck Connector Overrides
router.get('/bookings', ManagerController.getBookings);
router.post('/bookings/:id/free-connector', ManagerController.freeStuckConnector);

export const managerRouter = router;
