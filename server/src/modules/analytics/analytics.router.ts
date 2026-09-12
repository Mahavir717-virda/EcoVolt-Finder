import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { GamificationController } from '../gamification/gamification.controller';
import { requireAuth, requireRole, optionalAuth } from '../../middleware/auth.middleware';

export const analyticsRouter = Router();

// GET /analytics/station/:id (Manager / Admin, owner-scoped)
analyticsRouter.get('/station/:id', requireAuth, requireRole('manager', 'admin'), AnalyticsController.getStationAnalytics);

// GET /analytics/network (Admin only)
analyticsRouter.get('/network', requireAuth, requireRole('admin'), AnalyticsController.getNetworkAnalytics);

export const impactRouter = Router();

// GET /impact/me (Driver lifetime impact)
impactRouter.get('/me', requireAuth, AnalyticsController.getDriverImpact);

// GET /impact/leaderboard (Driver Green Score Leaderboard)
impactRouter.get('/leaderboard', optionalAuth, GamificationController.getLeaderboard);

// GET /impact/gamification/me (Driver Green Score, Streaks, Badges & Equivalencies)
impactRouter.get('/gamification/me', requireAuth, GamificationController.getMyGamification);

