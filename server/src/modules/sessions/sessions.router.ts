import { Router } from 'express';
import { SessionsController } from './sessions.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
 
router.get('/active', SessionsController.getActiveSession);
router.get('/:id', SessionsController.getSession);
router.post('/:id/start', SessionsController.startSession);
router.post('/:id/stop', SessionsController.stopSession);

// Manager routes
import { requireRole } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

router.get('/manager/active', requireRole(Role.manager), SessionsController.getManagerActiveSessions);
router.get('/manager/disputes', requireRole(Role.manager), SessionsController.getManagerDisputes);
router.post('/:id/force-stop', requireRole(Role.manager, Role.admin), SessionsController.forceStopSession);
router.post('/:id/dispute', requireRole(Role.manager, Role.admin), SessionsController.disputeSession);
router.post('/:id/refund', requireRole(Role.manager, Role.admin), SessionsController.refundSession);
router.post('/:id/resolve', requireRole(Role.manager, Role.admin), SessionsController.resolveDispute);

export const sessionsRouter = router;
