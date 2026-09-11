import { Router } from 'express';
import { Role } from '@prisma/client';
import { StationsController } from './stations.controller';
import {
  requireAuth,
  requireRole,
  requireStationOwnership,
} from '../../middleware/auth.middleware';

const router = Router();

// Public routes for station search and details
router.get('/', StationsController.searchStations);
router.get('/operators', StationsController.listOperators);
router.get('/:id', StationsController.getStation);

// Manager-protected station routes (RBAC + Ownership guards)
router.post(
  '/',
  requireAuth,
  requireRole(Role.manager, Role.admin),
  StationsController.createStation
);

router.patch(
  '/:id',
  requireAuth,
  requireRole(Role.manager, Role.admin),
  requireStationOwnership,
  StationsController.updateStation
);

router.post(
  '/:id/connectors',
  requireAuth,
  requireRole(Role.manager, Role.admin),
  requireStationOwnership,
  StationsController.addConnector
);

export const stationsRouter = router;
