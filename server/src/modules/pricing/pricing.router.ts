import { Router } from 'express';
import { Role } from '@prisma/client';
import { PricingController } from './pricing.controller';
import {
  requireAuth,
  requireRole,
  requireStationOwnership,
} from '../../middleware/auth.middleware';

const router = Router();

// Public endpoint for price quotes
router.get('/quote', PricingController.getQuote);

// Manager endpoint to update pricing rules
router.put(
  '/station/:stationId',
  requireAuth,
  requireRole(Role.manager, Role.admin),
  requireStationOwnership,
  PricingController.updatePricingRule
);

export const pricingRouter = router;
