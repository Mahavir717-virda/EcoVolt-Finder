import { Router } from 'express';
import { ManagerController } from './manager.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);
router.use(requireRole(Role.manager, Role.admin));

router.get('/profile', ManagerController.getProfile);
router.patch('/profile', ManagerController.updateProfile);

export const managerRouter = router;
