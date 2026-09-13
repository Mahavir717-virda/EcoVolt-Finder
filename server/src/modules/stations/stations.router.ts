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
router.get('/connectors/:id', StationsController.getConnector);
router.patch('/connectors/:id/status', StationsController.updateConnectorStatus);
router.get('/:id', StationsController.getStation);

// Manager-protected station routes (RBAC + Ownership guards)
router.get(
  '/manager/all',
  requireAuth,
  requireRole(Role.manager, Role.admin),
  StationsController.getManagerStations
);

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

router.patch(
  '/:id/demand-cap',
  requireAuth,
  requireRole(Role.manager, Role.admin),
  requireStationOwnership,
  StationsController.updateDemandCap
);

router.post(
  '/:id/connectors',
  requireAuth,
  requireRole(Role.manager, Role.admin),
  requireStationOwnership,
  StationsController.addConnector
);

router.patch(
  '/:id/connectors/:connectorId',
  requireAuth,
  requireRole(Role.manager, Role.admin),
  requireStationOwnership,
  StationsController.updateConnector
);

router.patch(
  '/:id/connectors/type/:connectorType/status',
  requireAuth,
  requireRole(Role.manager, Role.admin),
  requireStationOwnership,
  StationsController.updateConnectorStatusByType
);

export const stationsRouter = router;
