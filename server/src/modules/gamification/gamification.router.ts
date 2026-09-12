import { Router } from 'express';
import { GamificationController } from './gamification.controller';
import { requireAuth, optionalAuth } from '../../middleware/auth.middleware';

export const gamificationRouter = Router();

// GET /leaderboard or /impact/leaderboard (optionalAuth so anyone can view rankings, while identifying current user)
gamificationRouter.get('/leaderboard', optionalAuth, GamificationController.getLeaderboard);

// GET /gamification/me or /impact/gamification/me (requires auth)
gamificationRouter.get('/me', requireAuth, GamificationController.getMyGamification);
gamificationRouter.get('/gamification/me', requireAuth, GamificationController.getMyGamification);
