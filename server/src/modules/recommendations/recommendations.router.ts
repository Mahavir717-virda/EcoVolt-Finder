import { Router } from 'express';
import { getRecommendations } from './recommendations.controller';
import { requireAuth } from '../../middleware/auth.middleware';

export const recommendationsRouter = Router();

// GET /recommendations?originLat&originLng&vehicleId&kwh
recommendationsRouter.get('/', requireAuth, getRecommendations);
