import { SessionStatus, ConnectorType } from '@prisma/client';
import { prisma } from '../../db/client';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../../middleware/error-handler';
import { PricingService } from '../pricing/pricing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingInput } from './bookings.schema';

export class BookingsService {
  /**
   * Get active reservations for a station on a given date to calculate availability
   */
  public static async getStationAvailability(stationId: string, dateStr: string) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayStart = !isNaN(y) && !isNaN(m) && !isNaN(d)
      ? new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
      : new Date(dateStr);
    
    // Pad +- 14 hours to safely cover any client local timezone offsets
    const rangeStart = new Date(dayStart.getTime() - 14 * 3600 * 1000);
    const rangeEnd = new Date(dayStart.getTime() + 38 * 3600 * 1000);

    const bookings = await prisma.booking.findMany({
      where: {
        stationId,
        status: { in: [SessionStatus.reserved, SessionStatus.scheduled, SessionStatus.active] },
        AND: [
          { windowStart: { lt: rangeEnd } },
          { windowEnd: { gt: rangeStart } },
        ],
      },
      select: {
        id: true,
        connectorType: true,
        windowStart: true,
        windowEnd: true,
      },
    });

    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: { connectors: true },
    });

    return {
      bookings,
      connectors: station?.connectors || [],
    };
  }

  /**
   * List all bookings for a user
   */
  public static async listUserBookings(userId: string) {
    return prisma.booking.findMany({
      where: { userId },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            address: true,
            lat: true,
            lng: true,
            provider: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            model: true,
            vehicleClass: true,
          },
        },
        session: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single booking by ID with full details (station, vehicle, connector, session)
   */
  public static async getBookingById(userId: string, bookingId: string, role?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        station: {
          include: {
            connectors: true,
            operator: true,
          },
        },
        vehicle: true,
        connector: true,
        session: true,
      },
    });

    if (!booking) {
      throw new NotFoundError(`Booking not found with id: ${bookingId}`);
    }

    // Authorization check: Driver can only view their own bookings
    if (booking.userId !== userId && role !== 'admin' && role !== 'manager') {
      throw new NotFoundError(`Booking not found with id: ${bookingId}`);
    }

    return booking;
  }

  /**
   * Create a booking with anti-double-booking transaction and locked price snapshot
   * Edge Case #15: Uses row-level lock (FOR UPDATE) inside PostgreSQL transaction to serialize concurrent reservations
   * Edge Case #16: Peak stacking cap enforcement
   * Edge Case #17: Stores immutable locked price snapshot
   */
  public static async createBooking(userId: string, input: CreateBookingInput) {
    const { stationId, connectorType, vehicleId, windowStart, windowEnd } = input;

    const startDate = new Date(windowStart);
    const endDate = new Date(windowEnd);

    // Compute price quote before or during transaction
    const lockedPrice = await PricingService.computeQuote({
      stationId,
      connectorType: connectorType as ConnectorType,
      at: startDate,
    });

    const booking = await prisma.$transaction(
      async (tx) => {
        // 1. Verify vehicle exists and belongs to user
        const vehicle = await tx.vehicle.findFirst({
          where: { id: vehicleId, userId },
        });
        if (!vehicle) {
          throw new NotFoundError(`Vehicle not found with id: ${vehicleId}`);
        }

        // 2. Perform ROW LOCK on the Connector record to serialize concurrent bookings on the same plug
        const connectors: Array<{ id: string; totalCount: number }> = await tx.$queryRaw`
          SELECT id, "totalCount" FROM connectors 
          WHERE "stationId" = ${stationId} AND type = ${connectorType}::"ConnectorType"
          FOR UPDATE
        `;

        if (!connectors || connectors.length === 0) {
          throw new NotFoundError(
            `Connector type ${connectorType} is not available at this station`
          );
        }

        const connector = connectors[0];

        // 3. Count overlapping bookings for this connector type (Edge Case #15)
        const overlappingBookings = await tx.booking.count({
          where: {
            stationId,
            connectorType: connectorType as ConnectorType,
            status: { in: [SessionStatus.reserved, SessionStatus.scheduled, SessionStatus.active] },
            AND: [
              { windowStart: { lt: endDate } },
              { windowEnd: { gt: startDate } },
            ],
          },
        });

        if (overlappingBookings >= connector.totalCount) {
          throw new ConflictError(
            `No available ${connectorType} connectors for the requested time window`,
            {
              requestedWindow: { windowStart, windowEnd },
              totalConnectors: connector.totalCount,
              activeReservations: overlappingBookings,
            }
          );
        }

        // 4. Peak Demand Concurrency Check (Edge Case #16)
        const hourLocal =
          (startDate.getUTCHours() + 5 + Math.floor((startDate.getUTCMinutes() + 30) / 60)) % 24;
        const isPeakHour = hourLocal >= 18 && hourLocal <= 22; // 6pm to 10pm IST
        if (isPeakHour) {
          const totalStationOverlaps = await tx.booking.count({
            where: {
              stationId,
              status: { in: [SessionStatus.reserved, SessionStatus.scheduled, SessionStatus.active] },
              AND: [
                { windowStart: { lt: endDate } },
                { windowEnd: { gt: startDate } },
              ],
            },
          });

          // Fetch total plugs at station
          const station = await tx.station.findUnique({
            where: { id: stationId },
            include: { connectors: true },
          });

          const totalStationPlugs =
            station?.connectors.reduce((acc, c) => acc + c.totalCount, 0) || 1;
          const peakCap = Math.max(1, Math.floor(totalStationPlugs * 0.8));

          if (totalStationOverlaps >= peakCap) {
            throw new ConflictError(
              `Station peak demand charge limit reached for this window. Please select an off-peak or solar charging window!`,
              { peakCap, currentPeakSessions: totalStationOverlaps }
            );
          }
        }

        // 5. Create the booking record
        const booking = await tx.booking.create({
          data: {
            userId,
            stationId,
            connectorId: connector.id,
            connectorType: connectorType as ConnectorType,
            vehicleId,
            status: SessionStatus.reserved,
            windowStart: startDate,
            windowEnd: endDate,
            lockedPrice: lockedPrice as any,
          },
          include: {
            station: { select: { id: true, name: true, address: true, provider: true } },
            vehicle: { select: { id: true, model: true, vehicleClass: true } },
          },
        });

        return booking;
      },
      {
        isolationLevel: 'ReadCommitted',
        timeout: 10000,
      }
    );

    // Dynamic Notification Hook: Dispatch real booking confirmation notification to user
    try {
      const stationName = booking.station?.name || 'EcoVolt Supercharger';
      const vehicleModel = booking.vehicle?.model || 'EV Vehicle';
      const finalPrice = lockedPrice?.finalPrice;

      await NotificationsService.notifyBookingConfirmed(
        userId,
        booking.id,
        stationName,
        vehicleModel,
        startDate,
        endDate,
        connectorType,
        finalPrice
      );
    } catch (notifErr) {
      console.warn('Failed to dispatch booking confirmed notification:', notifErr);
    }

    return booking;
  }

  /**
   * Dynamically calculate remaining time and trigger arrival / slot reminder
   */
  public static async triggerBookingReminder(userId: string, bookingId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId },
      include: {
        station: { select: { id: true, name: true, address: true } },
        vehicle: { select: { id: true, model: true } },
      },
    });

    if (!booking) {
      throw new NotFoundError(`Booking not found with id: ${bookingId}`);
    }

    const now = Date.now();
    const startTime = new Date(booking.windowStart).getTime();
    const diffMs = startTime - now;
    const minutesRemaining = Math.max(0, Math.round(diffMs / (1000 * 60)));

    const notif = await NotificationsService.notifyBookingReminder(
      userId,
      booking.station.name,
      booking.windowStart,
      minutesRemaining,
      booking.id
    );

    return {
      success: true,
      bookingId: booking.id,
      stationName: booking.station.name,
      minutesRemaining,
      notification: notif,
    };
  }

  /**
   * Cancel booking within grace window (Edge Case #23)
   */
  public static async cancelBooking(userId: string, bookingId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId },
    });

    if (!booking) {
      throw new NotFoundError(`Booking not found with id: ${bookingId}`);
    }

    if (
      booking.status === SessionStatus.cancelled ||
      booking.status === SessionStatus.completed ||
      booking.status === SessionStatus.expired
    ) {
      throw new BadRequestError(`Cannot cancel a booking with status ${booking.status}`);
    }

    // Grace Window Check: Allowed up to 15 minutes before windowStart
    const now = new Date().getTime();
    const graceThreshold = new Date(booking.windowStart).getTime() - 15 * 60 * 1000;
    const isJustCreated = now - new Date(booking.createdAt).getTime() <= 15 * 60 * 1000;

    if (now > graceThreshold && !isJustCreated) {
      throw new BadRequestError(
        'Cancellation is only permitted up to 15 minutes prior to the scheduled window start'
      );
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: SessionStatus.cancelled,
      },
    });

    return {
      message: 'Booking cancelled successfully and slot released',
      refunded: true,
      booking: updated,
    };
  }
}
