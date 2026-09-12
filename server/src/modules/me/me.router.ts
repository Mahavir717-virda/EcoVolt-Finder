import { Router } from 'express';
import { MeController } from './me.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', MeController.getProfile);
router.patch('/', MeController.updateProfile);

// Favorites
router.get('/favorites', MeController.getFavorites);
router.post('/favorites/:stationId', MeController.addFavorite);
router.delete('/favorites/:stationId', MeController.removeFavorite);

export const meRouter = router;
