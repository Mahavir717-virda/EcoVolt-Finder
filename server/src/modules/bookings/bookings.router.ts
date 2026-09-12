import { Router } from 'express';
import { BookingsController } from './bookings.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/station/:stationId/availability', BookingsController.getStationAvailability);
router.get('/', BookingsController.listBookings);
router.get('/:id', BookingsController.getBookingById);
router.post('/', BookingsController.createBooking);
router.patch('/:id/cancel', BookingsController.cancelBooking);

export const bookingsRouter = router;
