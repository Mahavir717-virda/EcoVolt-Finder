import { prisma } from '../../db/client';
import { NotificationsService } from './notifications.service';
import { StationsService } from '../stations/stations.service';

export interface EvaluateSavingsResult {
  evaluated: boolean;
  notified: boolean;
  reason?: string;
  message?: string;
  savingsInr?: number;
  stationName?: string;
  stationId?: string;
  distanceKm?: number;
  availableChargers?: number;
}

export class SavingsEvaluatorService {
  /**
   * Evaluates if an EV driver qualifies for a proactive ₹100+ savings alert.
   * Enforces 3 smart guardrails:
   * 1. 24-Hour Cooldown (Max 1 alert/day)
   * 2. Battery State of Charge < 50%
   * 3. Net Savings >= ₹80 based on Station Operator Low-Occupancy Dynamic Discount
   */
  public static async evaluateUserForSavingsAlert(
    userId: string,
    userLat: number = 19.0657, // Default Mumbai BKC coordinates if not passed
    userLng: number = 72.8683
  ): Promise<EvaluateSavingsResult> {
    // 1. Guardrail #1: 24-Hour Cooldown Check
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAlert = await prisma.notificationLog.findFirst({
      where: {
        userId,
        sentAt: { gte: oneDayAgo },
      },
      orderBy: { sentAt: 'desc' },
    });

    if (recentAlert) {
      return {
        evaluated: true,
        notified: false,
        reason: 'COOLDOWN_ACTIVE',
        message: 'A proactive savings notification was already sent within the last 24 hours to prevent spam.',
      };
    }

    // 2. Guardrail #2: Battery State-of-Charge (SoC < 50%) Check
    const vehicle = await prisma.vehicle.findFirst({
      where: { userId },
      orderBy: [{ vehicleClass: 'asc' }, { batteryKwh: 'desc' }],
    });

    if (!vehicle) {
      return {
        evaluated: false,
        notified: false,
        reason: 'NO_VEHICLE',
        message: 'No EV registered under this account.',
      };
    }

    if (vehicle.currentChargePct >= 50.0) {
      return {
        evaluated: true,
        notified: false,
        reason: 'BATTERY_ABOVE_THRESHOLD',
        message: `Vehicle battery is at ${vehicle.currentChargePct}%, which is sufficient (>= 50%). No charge alert needed.`,
      };
    }

    // 3. Find nearby stations within 10 km
    const stations = await prisma.station.findMany({
      where: { isActive: true },
      include: {
        connectors: true,
        pricingRules: true,
        zone: { include: { tariffs: true } },
      },
    });

    if (!stations || stations.length === 0) {
      return {
        evaluated: true,
        notified: false,
        reason: 'NO_STATIONS_NEARBY',
        message: 'No active charging stations found in your area.',
      };
    }

    // 4. Calculate Distance, Occupancy & Dynamic Savings for each candidate
    let bestDeal: {
      station: typeof stations[0];
      distanceKm: number;
      savingsInr: number;
      availableChargers: number;
      discountPerKwh: number;
      effectiveRate: number;
    } | null = null;

    // Estimate energy needed to recharge from current SoC to 85% (typical session 25 - 35 kWh for cars)
    const targetSoC = 85.0;
    const socDifference = (targetSoC - vehicle.currentChargePct) / 100;
    const calculatedKwh = vehicle.batteryKwh * socDifference;
    const energyNeededKwh = vehicle.vehicleClass === 'car'
      ? Math.max(25.0, Math.round(calculatedKwh * 10) / 10)
      : Math.max(2.5, Math.round(calculatedKwh * 10) / 10);

    for (const station of stations) {
      const distanceKm = StationsService.calculateDistance(userLat, userLng, station.lat, station.lng);
      if (distanceKm > 12.0) continue; // within driving proximity

      const totalChargers = station.connectors.reduce((sum, c) => sum + c.totalCount, 0);
      const availableChargers = station.connectors.reduce((sum, c) => sum + c.availableCount, 0);
      const occupancyPct = totalChargers > 0 ? ((totalChargers - availableChargers) / totalChargers) * 100 : 100;

      const pricingRule = station.pricingRules[0];
      const thresholdPct = pricingRule?.occupancyThresholdPct ?? 50.0;
      const operatorDiscount = pricingRule?.lowOccupancyDiscountInr ?? 3.5;

      // Check if station qualifies for low-occupancy dynamic discount (e.g. >= 50% open plugs)
      if (occupancyPct <= thresholdPct && availableChargers > 0) {
        const tariff = station.zone.tariffs.find((t) => t.provider === station.provider);
        const baseRate = tariff ? tariff.baseRate : 13.0;
        const regularRate = baseRate + (pricingRule?.providerMarkup ?? 3.5);
        const discountedRate = Math.max(baseRate * 0.7, regularRate - operatorDiscount);
        const discountPerKwh = Math.round((regularRate - discountedRate) * 100) / 100;
        const totalSessionSavings = Math.round(energyNeededKwh * discountPerKwh);

        if (!bestDeal || totalSessionSavings > bestDeal.savingsInr || (totalSessionSavings === bestDeal.savingsInr && distanceKm < bestDeal.distanceKm)) {
          bestDeal = {
            station,
            distanceKm,
            savingsInr: totalSessionSavings,
            availableChargers,
            discountPerKwh,
            effectiveRate: discountedRate,
          };
        }
      }
    }

    // 5. Guardrail #3: Minimum Savings Threshold (>= ₹80)
    if (!bestDeal || bestDeal.savingsInr < 80) {
      return {
        evaluated: true,
        notified: false,
        reason: 'SAVINGS_BELOW_THRESHOLD',
        message: 'No station currently offers dynamic savings of ₹80 or higher.',
      };
    }

    // 6. Send Proactive Push Notification to Mobile Phone
    const notificationTitle = `⚡ Save ₹${bestDeal.savingsInr} on EV Recharge!`;
    const notificationBody = `Special low-occupancy deal at ${bestDeal.station.name} (${bestDeal.distanceKm} km away). ${bestDeal.availableChargers} open chargers at ₹${bestDeal.effectiveRate.toFixed(1)}/kWh.`;

    await NotificationsService.send({
      userId,
      type: 'smart_savings_alert',
      title: notificationTitle,
      body: notificationBody,
      data: {
        stationId: bestDeal.station.id,
        stationName: bestDeal.station.name,
        savingsInr: bestDeal.savingsInr,
        distanceKm: bestDeal.distanceKm,
        availableChargers: bestDeal.availableChargers,
        effectiveRate: bestDeal.effectiveRate,
      },
    });

    // 7. Record in NotificationLog to enforce 24h Cooldown
    await prisma.notificationLog.create({
      data: {
        userId,
        stationId: bestDeal.station.id,
        savingsInr: bestDeal.savingsInr,
        title: notificationTitle,
        body: notificationBody,
      },
    });

    return {
      evaluated: true,
      notified: true,
      savingsInr: bestDeal.savingsInr,
      stationName: bestDeal.station.name,
      stationId: bestDeal.station.id,
      distanceKm: bestDeal.distanceKm,
      availableChargers: bestDeal.availableChargers,
      message: `Proactive notification sent: Save ₹${bestDeal.savingsInr} at ${bestDeal.station.name}.`,
    };
  }
}
