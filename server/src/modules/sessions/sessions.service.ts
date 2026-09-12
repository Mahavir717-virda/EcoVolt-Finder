import { SessionStatus } from '@prisma/client';
import { prisma } from '../../db/client';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../../middleware/error-handler';
import { StopSessionInput } from './sessions.schema';
import { NotificationsService } from '../notifications/notifications.service';

export class SessionsService {
  /**
   * Get session details by ID
   */
  public static async getSession(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        booking: true,
        station: {
          select: {
            id: true,
            name: true,
            address: true,
            provider: true,
            lat: true,
            lng: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            model: true,
            vehicleClass: true,
            batteryKwh: true,
          },
        },
        connector: true,
      },
    });

    if (!session) {
      throw new NotFoundError(`Session not found with id: ${sessionId}`);
    }

    return session;
  }

  /**
   * Start a charging session from a booking
   */
  public static async startSession(userId: string, bookingOrSessionId: string) {
    // Check if a session already exists for this ID or booking ID
    let session = await prisma.session.findFirst({
      where: {
        OR: [{ id: bookingOrSessionId }, { bookingId: bookingOrSessionId }],
      },
      include: { connector: true },
    });

    if (session) {
      if (session.status === SessionStatus.active) {
        throw new ConflictError('Session is already active', { sessionId: session.id });
      }
      if (session.status === SessionStatus.completed) {
        throw new ConflictError('Session has already been completed', { sessionId: session.id });
      }
    }

    // Find the associated booking
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [{ id: bookingOrSessionId }, { id: session?.bookingId }],
        userId,
      },
      include: {
        connector: true,
      },
    });

    if (!booking) {
      throw new NotFoundError(
        `Booking not found for charging session activation: ${bookingOrSessionId}`
      );
    }

    // Edge Case #18: Check connector operational status
    if (booking.connector.status === 'offline' || booking.connector.status === 'maintenance') {
      throw new ConflictError(
        `Connector is currently ${booking.connector.status}. Please use another charger.`,
        { connectorStatus: booking.connector.status }
      );
    }

    const now = new Date();

    if (!session) {
      // Create active session
      session = await prisma.session.create({
        data: {
          bookingId: booking.id,
          stationId: booking.stationId,
          connectorId: booking.connectorId,
          connectorType: booking.connectorType,
          vehicleId: booking.vehicleId,
          userId,
          status: SessionStatus.active,
          startedAt: now,
          energyKwh: 0.0,
          cost: 0.0,
        },
        include: { connector: true },
      });
    } else {
      session = await prisma.session.update({
        where: { id: session.id },
        data: {
          status: SessionStatus.active,
          startedAt: now,
        },
        include: { connector: true },
      });
    }

    // Update booking status
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: SessionStatus.active },
    });

    return session;
  }

  /**
   * Stop an active charging session and compute billing & CO2 avoidance
   * Edge Case #17: Bills strictly using the locked price snapshot
   */
  public static async stopSession(
    userId: string,
    sessionId: string,
    input: StopSessionInput = {}
  ) {
    const session = await prisma.session.findFirst({
      where: {
        OR: [{ id: sessionId }, { bookingId: sessionId }],
        userId,
      },
      include: {
        booking: true,
        connector: true,
        vehicle: true,
        station: { select: { id: true, name: true, address: true } },
      },
    });

    if (!session) {
      throw new NotFoundError(`Session not found with id: ${sessionId}`);
    }

    if (session.status === SessionStatus.completed) {
      throw new ConflictError('Session is already stopped and completed', {
        sessionId: session.id,
        endedAt: session.endedAt,
      });
    }

    const endedAt = new Date();
    const startedAt = session.startedAt || new Date(endedAt.getTime() - 45 * 60 * 1000); // default 45m if missing
    const durationHours = Math.max(0.1, (endedAt.getTime() - startedAt.getTime()) / (1000 * 3600));

    // 1. Determine Energy Delivered (kWh)
    let energyKwh = input.energyKwh;
    if (!energyKwh) {
      // Mock meter reading based on powerKw & duration
      const powerKw = session.connector.powerKw || 50.0;
      const calculatedKwh = durationHours * powerKw * 0.9; // 90% power transfer efficiency
      const vehicleCap = session.vehicle.batteryKwh || 40.0;
      energyKwh = Math.min(vehicleCap, Math.max(1.0, Math.round(calculatedKwh * 10) / 10));
    }

    // 2. Bill Strictly at Locked Price Snapshot (Edge Case #17)
    const lockedPriceObj = session.booking.lockedPrice as Record<string, any> | null;
    const finalPricePerKwh = lockedPriceObj?.finalPrice ?? 14.5;
    const totalCost = Math.round(energyKwh * finalPricePerKwh * 100) / 100;

    // 3. Compute Renewable Share & Avoided CO2
    // Look up actual renewable % from ForecastCache for the session zone & window
    let avgRenewablePct = 65.0; // fallback: Indian grid average
    try {
      const stationWithZone = await prisma.station.findUnique({
        where: { id: session.stationId },
        select: { zoneId: true },
      });

      if (stationWithZone) {
        const forecast = await prisma.forecastCache.findFirst({
          where: {
            zoneId: stationWithZone.zoneId,
            hourStartLocal: {
              gte: startedAt,
              lte: endedAt,
            },
          },
          orderBy: { hourStartLocal: 'desc' },
        });

        if (forecast) {
          avgRenewablePct = forecast.renewablePct;
        }
      }
    } catch (e) {
      console.warn('Could not fetch forecast for session zone, using fallback:', e);
    }

    const gridBaselineIntensity = 710.0; // Indian grid average gCO2eq/kWh
    const achievedIntensity = gridBaselineIntensity * (1 - avgRenewablePct / 100);
    const co2AvoidedKg =
      Math.round(((energyKwh * (gridBaselineIntensity - achievedIntensity)) / 1000) * 100) / 100;

    // 4. Persist completed session
    const completedSession = await prisma.session.update({
      where: { id: session.id },
      data: {
        status: SessionStatus.completed,
        endedAt,
        energyKwh,
        cost: totalCost,
        avgRenewablePct,
        co2AvoidedKg,
      },
    });

    // Update booking status
    await prisma.booking.update({
      where: { id: session.bookingId },
      data: { status: SessionStatus.completed },
    });

    // Fire Notification hook
    try {
      const stationName = session.station?.name || 'EcoVolt Supercharger';
      const points = Math.max(25, Math.round(co2AvoidedKg * 10));

      await NotificationsService.notifySessionComplete(
        userId,
        energyKwh,
        totalCost,
        co2AvoidedKg,
        stationName,
        points
      );
    } catch (e) {
      console.warn('Failed to dispatch session complete notification:', e);
    }

    return completedSession;
  }
}
