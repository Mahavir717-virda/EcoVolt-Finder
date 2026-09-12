import { Request, Response, NextFunction } from 'express';
import { BookingsService } from './bookings.service';
import { createBookingSchema } from './bookings.schema';
import { ValidationError, UnauthorizedError } from '../../middleware/error-handler';

export class BookingsController {
  public static async getStationAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    try {
      const rawStationId = req.params.stationId;
      const stationId = Array.isArray(rawStationId) ? rawStationId[0] : rawStationId;
      const { date } = req.query;
      
      if (!date || typeof date !== 'string') {
        return next(new ValidationError('Date is required in query params', {}));
      }

      const availability = await BookingsService.getStationAvailability(stationId, date);
      res.status(200).json(availability);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /bookings/station/:stationId/slots
   * Returns real-time slot matrix per connector type for a given time window.
   * Query params:
   *   - windowStart (ISO, optional, defaults to now)
   *   - windowEnd   (ISO, optional, defaults to now + 1h)
   *   - connectorType (optional filter)
   *
   * This endpoint is public-safe — it shows slot counts but NOT which user holds a booking.
   * Auth is still required so anonymous scrapers can't poll indefinitely.
   */
  public static async getSlotMatrix(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    try {
      const rawStationId = req.params.stationId;
      const stationId = Array.isArray(rawStationId) ? rawStationId[0] : rawStationId;
      const { windowStart, windowEnd, connectorType } = req.query;

      const matrix = await BookingsService.getSlotMatrix(
        stationId,
        typeof windowStart === 'string' ? windowStart : undefined,
        typeof windowEnd === 'string' ? windowEnd : undefined,
        typeof connectorType === 'string' ? connectorType : undefined
      );

      res.status(200).json(matrix);
    } catch (err) {
      next(err);
    }
  }

  public static async listBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    try {
      const bookings = await BookingsService.listUserBookings(req.user.sub);
      res.status(200).json(bookings);
    } catch (err) {
      next(err);
    }
  }

  public static async getBookingById(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    try {
      const rawId = req.params.id;
      const bookingId = Array.isArray(rawId) ? rawId[0] : rawId;
      const booking = await BookingsService.getBookingById(req.user.sub, bookingId, req.user.role);
      res.status(200).json(booking);
    } catch (err) {
      next(err);
    }
  }

  public static async createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid booking request', parsed.error.format()));
    }

    try {
      const booking = await BookingsService.createBooking(req.user.sub, parsed.data);
      res.status(201).json(booking);
    } catch (err) {
      next(err);
    }
  }

  public static async cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    try {
      const rawId = req.params.id;
      const bookingId = Array.isArray(rawId) ? rawId[0] : rawId;
      const result = await BookingsService.cancelBooking(req.user.sub, bookingId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async triggerReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    try {
      const rawId = req.params.id;
      const bookingId = Array.isArray(rawId) ? rawId[0] : rawId;
      const result = await BookingsService.triggerBookingReminder(req.user.sub, bookingId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getManagerUpcomingBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookings = await BookingsService.getManagerUpcomingBookings(req.user!.sub);
      res.status(200).json(bookings);
    } catch (err) {
      next(err);
    }
  }

  public static async overrideStuckConnector(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawId = req.params.id;
      const bookingId = Array.isArray(rawId) ? rawId[0] : rawId;
      const result = await BookingsService.overrideStuckConnector(req.user!.sub, bookingId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
