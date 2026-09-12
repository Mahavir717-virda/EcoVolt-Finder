import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authRateLimiter } from '../../middleware/auth-rate-limiter';

const router = Router();

router.use(authRateLimiter);

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/google', AuthController.googleAuth);

export const authRouter = router;

