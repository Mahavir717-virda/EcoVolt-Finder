import { Router } from 'express';
import { BookingsController } from './bookings.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', BookingsController.listBookings);
router.post('/', BookingsController.createBooking);
router.patch('/:id/cancel', BookingsController.cancelBooking);

export const bookingsRouter = router;
