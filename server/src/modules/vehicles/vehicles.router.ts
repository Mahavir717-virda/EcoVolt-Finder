import { Router } from 'express';
import { VehiclesController } from './vehicles.controller';
import { requireAuth, optionalAuth } from '../../middleware/auth.middleware';

const router = Router();

// Read routes: optionalAuth allows authenticated users + query param lookups
router.get('/', optionalAuth, VehiclesController.listVehicles);
router.get('/:id', optionalAuth, VehiclesController.getVehicle);

// Mutation routes: require valid JWT
router.post('/', requireAuth, VehiclesController.createVehicle);
router.patch('/:id', requireAuth, VehiclesController.updateVehicle);
router.delete('/:id', requireAuth, VehiclesController.deleteVehicle);

export const vehiclesRouter = router;
