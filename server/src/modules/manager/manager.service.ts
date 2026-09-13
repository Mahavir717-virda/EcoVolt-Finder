import { prisma } from '../../db/client';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../middleware/error-handler';
import { ConnectorType, PowerProvider } from '@prisma/client';

export class ManagerService {
  /**
   * Resolves the operator account associated with the given user ID.
   */
  private static async getOperatorForUser(userId: string) {
    let operator = await prisma.operator.findFirst({
      where: { userId },
    });

    if (!operator) {
      // Auto-provision operator hub for manager user if missing
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundError('User not found');

      operator = await prisma.operator.create({
        data: {
          userId,
          name: `${user.name}'s EV Network`,
          contactEmail: user.email,
        },
      });
    }

    // Auto-link stations if operator currently has 0 stations
    const stationCount = await prisma.station.count({ where: { operatorId: operator.id } });
    if (stationCount === 0) {
      await prisma.station.updateMany({
        data: { operatorId: operator.id },
      });
    }

    return operator;
  }

  /**
   * Get Manager Profile (Operator details)
   */
  public static async getProfile(userId: string) {
    return this.getOperatorForUser(userId);
  }

  /**
   * Update Manager Profile / Payout Details
   */
  public static async updateProfile(userId: string, data: any) {
    const operator = await this.getOperatorForUser(userId);

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.contactEmail || data.supportEmail) {
      updateData.contactEmail = data.contactEmail || data.supportEmail;
    }
    if (data.payoutBankDetails !== undefined) {
      updateData.payoutBankDetails = data.payoutBankDetails;
    }
    if (data.notificationPrefs !== undefined) {
      updateData.notificationPrefs = data.notificationPrefs;
    }

    return prisma.operator.update({
      where: { id: operator.id },
      data: updateData,
    });
  }

  /**
   * Analytics & Performance Dashboard
   */
  public static async getAnalytics(userId: string) {
    const operator = await this.getOperatorForUser(userId);

    const stations = await prisma.station.findMany({
      where: { operatorId: operator.id },
      include: { connectors: true },
    });

    const stationIds = stations.map((s) => s.id);

    // Fetch sessions for operator's stations
    const sessions = await prisma.session.findMany({
      where: { stationId: { in: stationIds } },
    });

    const completedSessions = sessions.filter((s) => s.status === 'completed');
    const activeSessions = sessions.filter((s) => s.status === 'active');

    const totalRevenue = completedSessions.reduce((acc, s) => acc + (s.cost || 0), 0);
    const totalEnergyKwh = completedSessions.reduce((acc, s) => acc + (s.energyKwh || 0), 0);
    const totalCo2Avoided = completedSessions.reduce((acc, s) => acc + (s.co2AvoidedKg || 0), 0);

    const totalConnectors = stations.reduce((acc, s) => acc + s.connectors.length, 0);
    const inUseConnectors = stations.reduce(
      (acc, s) => acc + s.connectors.filter((c) => c.status === 'occupied' || c.availableCount < c.totalCount).length,
      0
    );

    const utilizationPct = totalConnectors > 0 ? Math.round((inUseConnectors / totalConnectors) * 100) : 0;
    const avgRenewablePct =
      completedSessions.length > 0
        ? Math.round(
            completedSessions.reduce((acc, s) => acc + (s.avgRenewablePct || 85), 0) / completedSessions.length
          )
        : 88;

    // Demand Charge Penalty Warning threshold (e.g. if active load > 100 kW)
    const currentActiveLoadKw = activeSessions.length * 45;
    const demandChargeRisk = currentActiveLoadKw > 100;

    return {
      operatorName: operator.name,
      totalStations: stations.length,
      totalConnectors,
      activeSessionsCount: activeSessions.length,
      totalSessionsCount: sessions.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalEnergyKwh: Math.round(totalEnergyKwh * 100) / 100,
      totalCo2AvoidedKg: Math.round(totalCo2Avoided * 100) / 100,
      utilizationPct,
      avgRenewablePct,
      gridAverageRenewablePct: 42,
      demandChargeRisk,
      currentActiveLoadKw,
      maxTransformerKw: 150.0,
    };
  }

  /**
   * List Stations owned by manager
   */
  public static async getStations(userId: string) {
    const operator = await this.getOperatorForUser(userId);

    return prisma.station.findMany({
      where: { operatorId: operator.id },
      include: {
        connectors: true,
        pricingRules: true,
        zone: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Onboard a new Charging Station
   */
  public static async createStation(userId: string, data: any) {
    const operator = await this.getOperatorForUser(userId);

    if (!data.name || !data.address) {
      throw new BadRequestError('Station name and address are required');
    }

    const lat = data.lat ? Number(data.lat) : 23.0225;
    const lng = data.lng ? Number(data.lng) : 72.5714;
    const zoneId = data.zoneId || 'IN-WE';
    const provider = (data.provider as PowerProvider) || PowerProvider.torrent_power;

    const stationData: any = {
      operatorId: operator.id,
      zoneId,
      name: data.name,
      address: data.address,
      lat,
      lng,
      provider,
      isActive: true,
      status: 'active',
      maxTransformerKw: data.maxTransformerKw ? Number(data.maxTransformerKw) : 150.0,
      connectors: {
        create: data.connectors && data.connectors.length > 0
          ? data.connectors.map((c: any) => ({
              type: (c.type as ConnectorType) || ConnectorType.ccs2,
              powerKw: c.powerKw ? Number(c.powerKw) : 60.0,
              totalCount: c.totalCount ? Number(c.totalCount) : 2,
              availableCount: c.availableCount ? Number(c.availableCount) : (c.totalCount ? Number(c.totalCount) : 2),
              status: 'available',
            }))
          : [
              {
                type: ConnectorType.ccs2,
                powerKw: 60.0,
                totalCount: 2,
                availableCount: 2,
                status: 'available',
              },
              {
                type: ConnectorType.type2_ac,
                powerKw: 22.0,
                totalCount: 2,
                availableCount: 2,
                status: 'available',
              },
            ],
      },
      pricingRules: {
        create: {
          providerMarkup: data.providerMarkup ? Number(data.providerMarkup) : 3.0,
          enableDynamicDiscount: data.enableDynamicDiscount ?? true,
          discountMaxKwh: data.discountMaxKwh ? Number(data.discountMaxKwh) : 3.0,
          lowOccupancyDiscountInr: data.lowOccupancyDiscountInr ? Number(data.lowOccupancyDiscountInr) : 2.5,
          occupancyThresholdPct: 50.0,
        },
      },
    };

    return prisma.station.create({
      data: stationData,
      include: {
        connectors: true,
        pricingRules: true,
      },
    });
  }

  /**
   * Update Connector Status (Toggle Maintenance / Available)
   */
  public static async updateConnectorStatus(userId: string, connectorId: string, status: string) {
    const operator = await this.getOperatorForUser(userId);

    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
      include: { station: true },
    });

    if (!connector || connector.station.operatorId !== operator.id) {
      throw new ForbiddenError('You do not have access to this connector');
    }

    const availableCount = status === 'maintenance' ? 0 : connector.totalCount;

    return prisma.connector.update({
      where: { id: connectorId },
      data: {
        status,
        availableCount,
      },
    });
  }

  /**
   * Get Pricing Rules & 24-hour Preview
   */
  public static async getPricing(userId: string) {
    const operator = await this.getOperatorForUser(userId);

    const stations = await prisma.station.findMany({
      where: { operatorId: operator.id },
      include: {
        pricingRules: true,
        connectors: true,
        zone: { include: { tariffs: true } },
      },
    });

    return stations.map((station) => {
      const tariff = station.zone.tariffs.find((t) => t.provider === station.provider);
      const baseTariff = tariff ? tariff.baseRate : 13.0;
      const rule = station.pricingRules[0] || {
        id: `default-${station.id}`,
        stationId: station.id,
        providerMarkup: 3.0,
        enableDynamicDiscount: true,
        discountMaxKwh: 3.0,
        lowOccupancyDiscountInr: 2.0,
        occupancyThresholdPct: 50.0,
      };

      const hourlyPreview = Array.from({ length: 24 }, (_, hour) => {
        const isSolarPeak = hour >= 11 && hour <= 15;
        const isEveningPeak = hour >= 18 && hour <= 22;

        let touAdj = 0;
        if (isEveningPeak) touAdj = 2.5;
        else if (isSolarPeak && rule.enableDynamicDiscount) touAdj = -Math.min(rule.discountMaxKwh || 3.0, 3.0);

        const price = Math.max(baseTariff * 0.6, baseTariff + (rule.providerMarkup || 0) + touAdj);
        return {
          hour: `${hour.toString().padStart(2, '0')}:00`,
          price: Math.round(price * 100) / 100,
          isSolarPeak,
          isEveningPeak,
        };
      });

      return {
        id: rule.id || `rule-${station.id}`,
        stationId: station.id,
        stationName: station.name,
        baseTariff,
        pricingRule: {
          id: rule.id,
          stationId: station.id,
          providerMarkup: rule.providerMarkup ?? 3.0,
          enableDynamicDiscount: rule.enableDynamicDiscount ?? true,
          discountMaxKwh: rule.discountMaxKwh ?? 3.0,
          lowOccupancyDiscountInr: rule.lowOccupancyDiscountInr ?? 2.0,
          occupancyThresholdPct: rule.occupancyThresholdPct ?? 50.0,
        },
        hourlyPreview,
      };
    });
  }

  /**
   * Create Pricing Rule (C in CRUD)
   */
  public static async createPricingRule(userId: string, input: any) {
    const operator = await this.getOperatorForUser(userId);

    const stationId = input.stationId;
    if (!stationId) {
      throw new BadRequestError('stationId is required');
    }

    const station = await prisma.station.findFirst({
      where: { id: stationId, operatorId: operator.id },
    });

    if (!station) {
      throw new ForbiddenError('Station not found or unauthorized');
    }

    // Upsert pricing rule for this station
    const existingRule = await prisma.pricingRule.findFirst({
      where: { stationId },
    });

    if (existingRule) {
      return prisma.pricingRule.update({
        where: { id: existingRule.id },
        data: {
          providerMarkup: input.providerMarkup !== undefined ? Number(input.providerMarkup) : existingRule.providerMarkup,
          enableDynamicDiscount: input.enableDynamicDiscount !== undefined ? Boolean(input.enableDynamicDiscount) : existingRule.enableDynamicDiscount,
          discountMaxKwh: input.discountMaxKwh !== undefined ? Number(input.discountMaxKwh) : existingRule.discountMaxKwh,
          lowOccupancyDiscountInr: input.lowOccupancyDiscountInr !== undefined ? Number(input.lowOccupancyDiscountInr) : existingRule.lowOccupancyDiscountInr,
          occupancyThresholdPct: input.occupancyThresholdPct !== undefined ? Number(input.occupancyThresholdPct) : existingRule.occupancyThresholdPct,
        },
      });
    }

    return prisma.pricingRule.create({
      data: {
        stationId,
        providerMarkup: input.providerMarkup !== undefined ? Number(input.providerMarkup) : 3.0,
        enableDynamicDiscount: input.enableDynamicDiscount ?? true,
        discountMaxKwh: input.discountMaxKwh !== undefined ? Number(input.discountMaxKwh) : 3.0,
        lowOccupancyDiscountInr: input.lowOccupancyDiscountInr !== undefined ? Number(input.lowOccupancyDiscountInr) : 2.0,
        occupancyThresholdPct: input.occupancyThresholdPct !== undefined ? Number(input.occupancyThresholdPct) : 50.0,
      },
    });
  }

  /**
   * Update Pricing Rule (U in CRUD)
   */
  public static async updatePricingRule(userId: string, targetId: string, input: any) {
    const operator = await this.getOperatorForUser(userId);

    // Try finding by stationId first, then by ruleId
    let existingRule = await prisma.pricingRule.findFirst({
      where: {
        OR: [
          { stationId: targetId },
          { id: targetId },
        ],
        station: { operatorId: operator.id },
      },
    });

    if (!existingRule) {
      // Check if targetId is a valid stationId for this operator
      const station = await prisma.station.findFirst({
        where: { id: targetId, operatorId: operator.id },
      });

      if (!station) {
        throw new NotFoundError('Station or Pricing Rule not found or unauthorized');
      }

      // Create new rule for station
      return prisma.pricingRule.create({
        data: {
          stationId: targetId,
          providerMarkup: input.providerMarkup !== undefined ? Number(input.providerMarkup) : 3.0,
          enableDynamicDiscount: input.enableDynamicDiscount ?? true,
          discountMaxKwh: input.discountMaxKwh !== undefined ? Number(input.discountMaxKwh) : 3.0,
          lowOccupancyDiscountInr: input.lowOccupancyDiscountInr !== undefined ? Number(input.lowOccupancyDiscountInr) : 2.0,
          occupancyThresholdPct: input.occupancyThresholdPct !== undefined ? Number(input.occupancyThresholdPct) : 50.0,
        },
      });
    }

    return prisma.pricingRule.update({
      where: { id: existingRule.id },
      data: {
        providerMarkup: input.providerMarkup !== undefined ? Number(input.providerMarkup) : existingRule.providerMarkup,
        enableDynamicDiscount: input.enableDynamicDiscount !== undefined ? Boolean(input.enableDynamicDiscount) : existingRule.enableDynamicDiscount,
        discountMaxKwh: input.discountMaxKwh !== undefined ? Number(input.discountMaxKwh) : existingRule.discountMaxKwh,
        lowOccupancyDiscountInr: input.lowOccupancyDiscountInr !== undefined ? Number(input.lowOccupancyDiscountInr) : existingRule.lowOccupancyDiscountInr,
        occupancyThresholdPct: input.occupancyThresholdPct !== undefined ? Number(input.occupancyThresholdPct) : existingRule.occupancyThresholdPct,
      },
    });
  }

  /**
   * Delete Pricing Rule (D in CRUD)
   */
  public static async deletePricingRule(userId: string, targetId: string) {
    const operator = await this.getOperatorForUser(userId);

    const existingRule = await prisma.pricingRule.findFirst({
      where: {
        OR: [
          { id: targetId },
          { stationId: targetId },
        ],
        station: { operatorId: operator.id },
      },
    });

    if (!existingRule) {
      throw new NotFoundError('Pricing Rule not found or unauthorized');
    }

    await prisma.pricingRule.delete({
      where: { id: existingRule.id },
    });

    return { message: 'Pricing rule deleted successfully. Station reset to base grid tariff.' };
  }

  /**
   * List Sessions (Live & Historical)
   */
  public static async getSessions(userId: string) {
    const operator = await this.getOperatorForUser(userId);

    const stations = await prisma.station.findMany({
      where: { operatorId: operator.id },
      select: { id: true },
    });

    const stationIds = stations.map((s) => s.id);

    return prisma.session.findMany({
      where: { stationId: { in: stationIds } },
      include: {
        station: true,
        connector: true,
        user: { select: { id: true, name: true, email: true } },
        vehicle: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Force Stop an Active Session
   */
  public static async forceStopSession(userId: string, sessionId: string) {
    const operator = await this.getOperatorForUser(userId);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { station: true },
    });

    if (!session || session.station.operatorId !== operator.id) {
      throw new ForbiddenError('Unauthorized to stop this session');
    }

    if (session.status !== 'active' && session.status !== 'scheduled') {
      throw new BadRequestError('Session is not active');
    }

    const sessionUpdate: any = {
      status: 'completed',
      endedAt: new Date(),
      resolutionNotes: 'Force-stopped by Station Manager via Manager Hub',
    };

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: sessionUpdate,
    });

    await prisma.connector.update({
      where: { id: session.connectorId },
      data: { status: 'available' },
    });

    return updated;
  }

  /**
   * Issue Refund / Dispute Resolution
   */
  public static async refundSession(userId: string, sessionId: string, reason?: string) {
    const operator = await this.getOperatorForUser(userId);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { station: true },
    });

    if (!session || session.station.operatorId !== operator.id) {
      throw new ForbiddenError('Unauthorized to refund this session');
    }

    const refundUpdate: any = {
      refundStatus: 'refunded',
      disputeReason: reason || 'Manager issued resolution refund',
      resolutionNotes: `Refund approved by ${operator.name} on ${new Date().toLocaleDateString()}`,
    };

    return prisma.session.update({
      where: { id: sessionId },
      data: refundUpdate,
    });
  }

  /**
   * List Bookings & Release Stuck Connectors
   */
  public static async getBookings(userId: string) {
    const operator = await this.getOperatorForUser(userId);

    const stations = await prisma.station.findMany({
      where: { operatorId: operator.id },
      select: { id: true },
    });

    const stationIds = stations.map((s) => s.id);

    return prisma.booking.findMany({
      where: { stationId: { in: stationIds } },
      include: {
        station: true,
        connector: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { windowStart: 'desc' },
      take: 50,
    });
  }

  /**
   * Free a Stuck Connector / Expire Reservation
   */
  public static async freeStuckConnector(userId: string, bookingId: string) {
    const operator = await this.getOperatorForUser(userId);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { station: true },
    });

    if (!booking || booking.station.operatorId !== operator.id) {
      throw new ForbiddenError('Unauthorized to modify this booking');
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'expired' },
    });

    await prisma.connector.update({
      where: { id: booking.connectorId },
      data: { status: 'available', availableCount: 1 },
    });

    return { success: true, message: 'Connector successfully released to available state' };
  }
}
