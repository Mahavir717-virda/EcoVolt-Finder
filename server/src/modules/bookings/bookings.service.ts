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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PortDetail {
  portNumber: number;
  status: 'available' | 'booked' | 'maintenance' | 'offline';
  bookingId?: string;
}

export interface ConnectorSlot {
  connectorId: string;
  type: ConnectorType;
  powerKw: number;
  status: string; // available | occupied | maintenance | offline
  totalCount: number;
  availableCount: number;
  bookedCount: number; // derived from active bookings for the given window
  ports: PortDetail[];
}

export interface SlotAvailabilityResponse {
  stationId: string;
  windowStart: string;
  windowEnd: string;
  connectors: ConnectorSlot[];
  totalFree: number;
  totalOccupied: number;
  totalCapacity: number;
}

export class BookingsService {
  /**
   * Get active reservations for a station on a given date to calculate availability.
   * Returns raw bookings + connectors for the legacy calendar UI.
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
        connectorId: true,
        connectorType: true,
        windowStart: true,
        windowEnd: true,
        status: true,
        // Do NOT expose userId to protect privacy
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
   * Get structured real-time slot availability for a station + time window.
   * This is the primary method for the slot availability UI — it merges live DB
   * availableCount with actual active bookings to give an accurate picture.
   *
   * @param stationId - Station to check
   * @param windowStart - ISO string for window start (defaults to now)
   * @param windowEnd   - ISO string for window end  (defaults to now + 1h)
   * @param connectorType - Optional filter by connector type
   */
  public static async getSlotMatrix(
    stationId: string,
    windowStart?: string,
    windowEnd?: string,
    connectorType?: string
  ): Promise<SlotAvailabilityResponse> {
    const start = windowStart ? new Date(windowStart) : new Date();
    const end = windowEnd ? new Date(windowEnd) : new Date(start.getTime() + 3600 * 1000);

    // Fetch connectors (optionally filtered by type)
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: {
        connectors: connectorType
          ? { where: { type: connectorType as ConnectorType } }
          : true,
      },
    });

    if (!station) {
      throw new NotFoundError(`Station not found: ${stationId}`);
    }

    // Count active bookings per connector for the window in one query
    const bookingCounts = await prisma.booking.groupBy({
      by: ['connectorId'],
      where: {
        stationId,
        status: { in: [SessionStatus.reserved, SessionStatus.scheduled, SessionStatus.active] },
        AND: [
          { windowStart: { lt: end } },
          { windowEnd: { gt: start } },
        ],
        ...(connectorType ? { connectorType: connectorType as ConnectorType } : {}),
      },
      _count: { id: true },
    });

    const bookedByConnectorId = new Map<string, number>(
      bookingCounts.map((b) => [b.connectorId, b._count.id])
    );

    const connectorSlots: ConnectorSlot[] = station.connectors.map((c) => {
      const booked = bookedByConnectorId.get(c.id) ?? 0;
      const free = Math.max(0, c.totalCount - booked);

      const ports: PortDetail[] = Array.from({ length: c.totalCount }, (_, idx) => {
        const portNumber = idx + 1;
        if (c.status === 'maintenance' || c.status === 'offline') {
          return { portNumber, status: c.status as 'maintenance' | 'offline' };
        }
        if (idx < booked) {
          return { portNumber, status: 'booked' };
        }
        return { portNumber, status: 'available' };
      });

      const isOperational = c.status !== 'maintenance' && c.status !== 'offline';
      const availableCount = isOperational ? free : 0;

      return {
        connectorId: c.id,
        type: c.type,
        powerKw: c.powerKw,
        // Respect maintenance/offline status from DB
        status:
          !isOperational
            ? c.status
            : free > 0
            ? 'available'
            : 'occupied',
        totalCount: c.totalCount,
        availableCount,
        bookedCount: booked,
        ports,
      };
    });

    const totalCapacity = connectorSlots.reduce((a, c) => a + c.totalCount, 0);
    const totalOccupied = connectorSlots.reduce((a, c) => a + c.bookedCount, 0);
    const totalFree = connectorSlots.reduce((a, c) => a + c.availableCount, 0);

    return {
      stationId,
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
      connectors: connectorSlots,
      totalFree,
      totalOccupied,
      totalCapacity,
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
   * Create a booking with anti-double-booking transaction and locked price snapshot.
   *
   * Race condition prevention strategy:
   *  - Edge Case #15: SERIALIZABLE isolation prevents phantom reads during concurrent slot-count checks.
   *  - Row-level FOR UPDATE lock on the connector row serializes all concurrent bookings on the same plug.
   *  - Atomic availableCount decrement (GREATEST(0, availableCount - 1)) keeps the field accurate.
   *  - Edge Case #16: Peak stacking cap enforcement.
   *  - Edge Case #17: Stores immutable locked price snapshot.
   */
  public static async createBooking(userId: string, input: CreateBookingInput) {
    const { stationId, connectorType, vehicleId, windowStart, windowEnd } = input;

    const startDate = new Date(windowStart);
    const endDate = new Date(windowEnd);

    if (startDate.getTime() < Date.now() - 5 * 60 * 1000) {
      throw new BadRequestError('Booking window start cannot be in the past');
    }

    if (startDate.getTime() > Date.now() + 30 * 24 * 60 * 60 * 1000) {
      throw new BadRequestError('Booking horizon cannot exceed 30 days in advance');
    }

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

        // 1b. Check if this same user already has an active overlapping booking
        const userOverlap = await tx.booking.findFirst({
          where: {
            userId,
            status: { in: [SessionStatus.reserved, SessionStatus.scheduled, SessionStatus.active] },
            AND: [
              { windowStart: { lt: endDate } },
              { windowEnd: { gt: startDate } },
            ],
          },
          include: {
            station: { select: { name: true } },
          },
        });

        if (userOverlap) {
          throw new ConflictError(
            `You already have an active reservation at ${userOverlap.station?.name || 'a station'} during this requested time interval. Please choose another time or cancel your existing reservation.`,
            { existingBookingId: userOverlap.id }
          );
        }

        // 2. Row-level lock on Connector records to serialize concurrent bookings on the same plug type.
        //    Under SERIALIZABLE isolation this also prevents phantoms in the count query that follows.
        const connectors: Array<{ id: string; totalCount: number; status: string }> = await tx.$queryRaw`
          SELECT id, "totalCount", status FROM connectors 
          WHERE "stationId" = ${stationId} AND type = ${connectorType}::"ConnectorType"
          FOR UPDATE
        `;

        if (!connectors || connectors.length === 0) {
          throw new NotFoundError(
            `Connector type ${connectorType} is not available at this station`
          );
        }

        const connector = connectors[0];

        // 3. Reject booking if connector is offline or under maintenance
        if (connector.status === 'offline' || connector.status === 'maintenance') {
          throw new ConflictError(
            `Connector is currently ${connector.status}. Please choose another charger.`,
            { connectorStatus: connector.status }
          );
        }

        // 4. Count overlapping bookings for this connector type (Edge Case #15)
        //    Under SERIALIZABLE isolation, this count is stable — no concurrent TX can insert
        //    a new booking with the same connectorType/window without being serialized after ours.
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

        // 5. Peak Demand Concurrency Check (Edge Case #16)
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

        // 6. Create the booking record
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
            connector: { select: { id: true, type: true, powerKw: true } },
          },
        });

        // 7. Atomically decrement availableCount on the connector.
        //    Uses GREATEST(0, ...) to prevent going negative under any edge case.
        await tx.$executeRaw`
          UPDATE connectors
          SET "availableCount" = GREATEST(0, "availableCount" - 1),
              "updatedAt" = now()
          WHERE id = ${connector.id}
        `;

        return booking;
      },
      {
        // SERIALIZABLE prevents phantom reads: two concurrent TXs both checking
        // overlappingBookings < totalCount will be serialized — one will succeed,
        // the other will fail with a serialization error and be safely retried/rejected.
        isolationLevel: 'Serializable',
        timeout: 12000,
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
   * Cancel booking within grace window (Edge Case #23).
   * Releases the slot by incrementing connector availableCount atomically.
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

    // Run cancel + availableCount increment in one transaction
    const updated = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: SessionStatus.cancelled,
        },
      });

      // Release the slot — increment availableCount up to totalCount ceiling
      await tx.$executeRaw`
        UPDATE connectors
        SET "availableCount" = LEAST("totalCount", "availableCount" + 1),
            "updatedAt" = now()
        WHERE id = ${booking.connectorId}
      `;

      return updated;
    });

    return {
      message: 'Booking cancelled successfully and slot released',
      refunded: true,
      booking: updated,
    };
  }
}
