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
}
