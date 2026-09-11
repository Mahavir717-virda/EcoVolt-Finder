import { Router } from 'express';
import { MeController } from './me.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', MeController.getProfile);
router.patch('/', MeController.updateProfile);

export const meRouter = router;
