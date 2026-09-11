import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { requireAuth } from '../../middleware/auth.middleware';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

// POST /notifications/token
notificationsRouter.post('/token', NotificationsController.registerToken);

// GET /notifications
notificationsRouter.get('/', NotificationsController.getHistory);

// PATCH /notifications/:id/read
notificationsRouter.patch('/:id/read', NotificationsController.markRead);
