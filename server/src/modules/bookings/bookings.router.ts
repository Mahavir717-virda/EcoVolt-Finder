import { Router } from 'express';
import { BookingsController } from './bookings.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// ─── Availability & Slot Matrix ──────────────────────────────────────────────
// Legacy date-based availability (returns raw booking windows + connector list)
router.get('/station/:stationId/availability', BookingsController.getStationAvailability);
// Real-time structured slot matrix (per-connector free/occupied counts for a window)
router.get('/station/:stationId/slots', BookingsController.getSlotMatrix);

// ─── Booking CRUD ────────────────────────────────────────────────────────────
router.get('/', BookingsController.listBookings);
router.get('/:id', BookingsController.getBookingById);
router.post('/', BookingsController.createBooking);
router.patch('/:id/cancel', BookingsController.cancelBooking);
router.post('/:id/reminder', BookingsController.triggerReminder);
router.post('/:id/nudge', BookingsController.triggerReminder);

export const bookingsRouter = router;
