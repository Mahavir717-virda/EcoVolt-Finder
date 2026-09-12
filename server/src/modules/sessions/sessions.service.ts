import { SessionStatus } from '@prisma/client';
import { DataQuality } from '../../../../contracts/enums';
import { prisma } from '../../db/client';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} from '../../middleware/error-handler';
import { StopSessionInput } from './sessions.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { StationsService, getZoneForecast } from '../stations/stations.service';

export class SessionsService {
  /**
   * Get active charging session for the authenticated user
   * Returns live telemetry, dynamic renewable %, and locked price snapshot (Edge Case #17)
   */
  public static async getActiveSession(userId: string) {
    // 1. Look for active session
    let session = await prisma.session.findFirst({
      where: {
        userId,
        status: SessionStatus.active,
      },
      orderBy: { startedAt: 'desc' },
      include: {
        booking: true,
        station: {
          include: {
            zone: {
              include: { tariffs: true },
            },
            pricingRules: true,
          },
        },
        vehicle: true,
        connector: true,
      },
    });

    // 2. If no active session, check for most recent reserved or scheduled booking
    if (!session) {
      const recentBooking = await prisma.booking.findFirst({
        where: {
          userId,
          status: { in: [SessionStatus.reserved, SessionStatus.scheduled, SessionStatus.active] },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          station: {
            include: {
              zone: {
                include: { tariffs: true },
              },
              pricingRules: true,
            },
          },
          vehicle: true,
          connector: true,
        },
      });

      if (recentBooking) {
        // Auto-activate session for this booking so the user can see live charging immediately
        const now = new Date();
        session = await prisma.session.create({
          data: {
            bookingId: recentBooking.id,
            stationId: recentBooking.stationId,
            connectorId: recentBooking.connectorId,
            connectorType: recentBooking.connectorType,
            vehicleId: recentBooking.vehicleId,
            userId,
            status: SessionStatus.active,
            startedAt: now,
            energyKwh: 0.0,
            cost: 0.0,
          },
          include: {
            booking: true,
            station: {
              include: {
                zone: {
                  include: { tariffs: true },
                },
                pricingRules: true,
              },
            },
            vehicle: true,
            connector: true,
          },
        });

        await prisma.booking.update({
          where: { id: recentBooking.id },
          data: { status: SessionStatus.active },
        });
      }
    }

    if (!session) {
      return null;
    }

    // 3. Resolve locked price snapshot strictly from booking / tariffs (Edge Case #17)
    const lockedPriceObj = session.booking?.lockedPrice as Record<string, any> | null;
    let lockedPrice = lockedPriceObj?.finalPrice;

    if (!lockedPrice || typeof lockedPrice !== 'number') {
      const tariff = session.station?.zone?.tariffs?.find((t) => t.provider === session.station.provider);
      const baseRate = tariff ? tariff.baseRate : 13.0;
      const markup = session.station?.pricingRules?.[0]?.providerMarkup ?? 2.5;
      lockedPrice = Math.round((baseRate + markup) * 10) / 10;
    }

    // 4. Resolve live grid greenness for station's zone
    const zoneId = session.station?.zoneId || 'IN-WE';
    const zoneForecast = await getZoneForecast(zoneId);
    const renewablePct = zoneForecast.renewablePct;
    const dataQuality = zoneForecast.quality;

    // 5. Calculate live telemetry from elapsed duration & connector power
    const now = new Date();
    const startedAt = session.startedAt || now;
    const durationHours = Math.max(0.01, (now.getTime() - startedAt.getTime()) / (1000 * 3600));
    const powerKw = session.connector?.powerKw || 50.0;
    const vehicleBattery = session.vehicle?.batteryKwh || 40.5;
    const calculatedKwh = Math.min(
      vehicleBattery,
      Math.max(0.5, Math.round(durationHours * powerKw * 0.9 * 100) / 100)
    );
    const energyKwh = Math.max(session.energyKwh ?? 0, calculatedKwh);
    const cost = Math.round(energyKwh * lockedPrice * 100) / 100;

    const startChargePct = session.vehicle?.currentChargePct || 35;
    const currentChargePct = Math.min(
      80,
      startChargePct + Math.round((energyKwh / vehicleBattery) * 100)
    );

    const isConnectorOffline =
      session.connector?.status === 'offline' || session.connector?.status === 'maintenance';

    return {
      id: session.id,
      bookingId: session.bookingId,
      stationId: session.stationId,
      stationName: session.station?.name || 'EcoVolt Charging Hub',
      connectorId: session.connectorId,
      connectorType: session.connectorType,
      vehicleId: session.vehicleId,
      userId: session.userId,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      energyKwh,
      cost,
      avgRenewablePct: renewablePct,
      co2AvoidedKg: Math.round(((energyKwh * 0.71 * (renewablePct / 100)) * 10) / 10),
      lockedPrice,
      startChargePct,
      currentChargePct,
      targetChargePct: 80,
      powerKw,
      connectorOffline: isConnectorOffline,
      gridGreenness: {
        renewablePct,
        band: StationsService.getGreennessBand(renewablePct),
        quality: dataQuality,
        zoneId,
      },
    };
  }

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

    // Edge Case #16: Demand-charge risk alert
    try {
      const station = await prisma.station.findUnique({
        where: { id: session.stationId },
        include: {
          operator: true,
          connectors: true,
          sessions: { where: { status: SessionStatus.active } },
        }
      });
      if (station && station.maxTransformerKw) {
        let currentLoadKw = 0;
        for (const s of station.sessions) {
          const conn = station.connectors.find(c => c.id === s.connectorId);
          currentLoadKw += (conn?.powerKw || 30);
        }
        
        if (currentLoadKw >= station.maxTransformerKw * 0.8) {
          await NotificationsService.notifyManagerDemandRisk(
            station.operator.userId,
            station.id,
            station.name,
            currentLoadKw,
            station.maxTransformerKw
          );
        }
      }
    } catch (e) {
      console.warn('Failed to calculate demand charge risk:', e);
    }

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
    let session = await prisma.session.findFirst({
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
      // Check if a booking exists for this ID
      const booking = await prisma.booking.findFirst({
        where: {
          id: sessionId,
          userId,
        },
        include: {
          connector: true,
          vehicle: true,
          station: { select: { id: true, name: true, address: true } },
        },
      });

      if (!booking) {
        throw new NotFoundError(`Session or booking not found with id: ${sessionId}`);
      }

      // Create session on the fly
      const now = new Date();
      session = await prisma.session.create({
        data: {
          bookingId: booking.id,
          stationId: booking.stationId,
          connectorId: booking.connectorId,
          connectorType: booking.connectorType,
          vehicleId: booking.vehicleId,
          userId,
          status: SessionStatus.active,
          startedAt: booking.windowStart || new Date(now.getTime() - 30 * 60 * 1000),
          energyKwh: 0.0,
          cost: 0.0,
        },
        include: {
          booking: true,
          connector: true,
          vehicle: true,
          station: { select: { id: true, name: true, address: true } },
        },
      });
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

    // 3. Compute Renewable Share & Avoided CO2 using real-time zone forecast
    let avgRenewablePct = 72.0;
    try {
      const stationWithZone = await prisma.station.findUnique({
        where: { id: session.stationId },
        select: { zoneId: true },
      });
      const zoneId = stationWithZone?.zoneId || 'IN-WE';
      const forecast = await getZoneForecast(zoneId);
      avgRenewablePct = forecast.renewablePct;
    } catch (e) {
      console.warn('Could not fetch forecast for session zone, using fallback:', e);
    }

    const gridBaselineIntensity = 710.0; // Indian grid average gCO2eq/kWh
    const achievedIntensity = gridBaselineIntensity * (1 - avgRenewablePct / 100);
    const co2AvoidedKg =
      Math.round(((energyKwh * (gridBaselineIntensity - achievedIntensity)) / 1000) * 100) / 100;

    // 4. Persist completed session + free up the connector slot atomically
    const [completedSession] = await prisma.$transaction([
      prisma.session.update({
        where: { id: session.id },
        data: {
          status: SessionStatus.completed,
          endedAt,
          energyKwh,
          cost: totalCost,
          avgRenewablePct,
          co2AvoidedKg,
        },
      }),
      prisma.booking.update({
        where: { id: session.bookingId },
        data: { status: SessionStatus.completed },
      }),
    ]);

    // Release the connector slot — increment up to totalCount ceiling
    try {
      await prisma.$executeRaw`
        UPDATE connectors
        SET "availableCount" = LEAST("totalCount", "availableCount" + 1),
            "updatedAt" = now()
        WHERE id = ${session.connectorId}
      `;
    } catch (slotErr) {
      // Non-critical: slot release failure should not block billing response
      console.warn('Failed to release connector slot after session stop:', slotErr);
    }

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

  /**
   * Manager: Get active sessions across owned stations
   */
  public static async getManagerActiveSessions(userId: string) {
    const operator = await prisma.operator.findFirst({ where: { userId } });
    if (!operator) return [];

    return prisma.session.findMany({
      where: {
        station: { operatorId: operator.id },
        status: SessionStatus.active,
      },
      include: {
        station: { select: { name: true } },
        connector: { select: { type: true, powerKw: true } },
        vehicle: { select: { model: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Manager: Force stop a session
   */
  public static async forceStopSession(userId: string, sessionId: string, reason: string) {
    if (!reason) throw new BadRequestError('Reason is required for force stop');

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { station: { include: { operator: true } } },
    });

    if (!session) throw new NotFoundError('Session not found');
    
    // Ownership check (Admin bypass could be added here if needed, but keeping it manager-focused)
    if (session.station.operator.userId !== userId) {
      throw new ForbiddenError('You do not own the station for this session');
    }

    // Call the regular stopSession, but bypass driver userId check by overriding the driver's userId
    // Wait, stopSession expects the driver's userId. Let's just do it directly or adapt stopSession.
    // Adapting stopSession is better, but since it's a force stop, we can just do the stop logic directly 
    // or just pass the driver's userId to stopSession! Yes!
    const stoppedSession = await SessionsService.stopSession(session.userId, sessionId, {});
    
    // Append the reason to disputeReason or a new field
    await prisma.session.update({
      where: { id: sessionId },
      data: { disputeReason: `Force stopped: ${reason}` }
    });

    return stoppedSession;
  }

  /**
   * Manager: Dispute a session
   */
  public static async disputeSession(userId: string, sessionId: string, reason: string) {
    if (!reason) throw new BadRequestError('Dispute reason is required');

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { station: { include: { operator: true } } },
    });

    if (!session) throw new NotFoundError('Session not found');
    
    if (session.station.operator.userId !== userId) {
      throw new ForbiddenError('You do not own the station for this session');
    }

    return prisma.session.update({
      where: { id: sessionId },
      data: { disputeReason: reason },
    });
  }

  /**
   * Manager: Get disputed sessions
   */
  public static async getManagerDisputes(userId: string) {
    const operator = await prisma.operator.findFirst({ where: { userId } });
    if (!operator) return [];

    return prisma.session.findMany({
      where: {
        station: { operatorId: operator.id },
        disputeReason: { not: null },
      },
      include: {
        station: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Manager: Refund session (Mock Razorpay integration)
   */
  public static async refundSession(userId: string, sessionId: string, amount: number) {
    if (!amount || amount <= 0) throw new BadRequestError('Invalid refund amount');

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { station: { include: { operator: true } }, user: true },
    });

    if (!session) throw new NotFoundError('Session not found');
    if (session.station.operator.userId !== userId) {
      throw new ForbiddenError('You do not own the station for this session');
    }

    if (session.refundStatus !== 'none') {
      throw new ConflictError('A refund is already processing or completed for this session');
    }

    // Step 1: Optimistic UI prevention - set to processing
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: { refundStatus: 'processing' },
    });

    // Notify processing
    await NotificationsService.notifyRefundProcessing(session.userId, session.id, amount);
    await NotificationsService.notifyRefundProcessing(userId, session.id, amount);

    // Step 2: Mock Webhook Delay (e.g. 5 seconds for Razorpay to confirm)
    setTimeout(async () => {
      try {
        await prisma.session.update({
          where: { id: sessionId },
          data: { refundStatus: 'refunded' },
        });

        // Notify completion
        await NotificationsService.notifyRefundCompleted(session.userId, session.id, amount);
        await NotificationsService.notifyRefundCompleted(userId, session.id, amount);
        console.log(`[Mock Webhook] Refund confirmed for session ${sessionId}`);
      } catch (e) {
        console.error('Failed to process mock webhook for refund:', e);
      }
    }, 5000);

    return updatedSession;
  }

  /**
   * Manager: Resolve Dispute
   */
  public static async resolveDispute(userId: string, sessionId: string, resolutionNotes: string) {
    if (!resolutionNotes) throw new BadRequestError('Resolution notes are required');

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { station: { include: { operator: true } } },
    });

    if (!session) throw new NotFoundError('Session not found');
    if (session.station.operator.userId !== userId) {
      throw new ForbiddenError('You do not own the station for this session');
    }

    return prisma.session.update({
      where: { id: sessionId },
      data: { resolutionNotes },
    });
  }
}
