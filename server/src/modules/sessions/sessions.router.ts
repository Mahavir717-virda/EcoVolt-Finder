import { Router } from 'express';
import { SessionsController } from './sessions.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/:id', SessionsController.getSession);
router.post('/:id/start', SessionsController.startSession);
router.post('/:id/stop', SessionsController.stopSession);

export const sessionsRouter = router;
