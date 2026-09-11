import { Router } from 'express';
import { VehiclesController } from './vehicles.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', VehiclesController.listVehicles);
router.post('/', VehiclesController.createVehicle);
router.patch('/:id', VehiclesController.updateVehicle);
router.delete('/:id', VehiclesController.deleteVehicle);

export const vehiclesRouter = router;
