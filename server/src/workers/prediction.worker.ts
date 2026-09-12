/**
 * Background Prediction Worker
 * Runs personalized ML inference jobs across all registered users for proactive dynamic smart savings & solar alerts.
 */

import { prisma } from '../db/client';
import { mlClient } from '../integrations/mlClient';
import { notificationsService } from '../modules/notifications/notifications.service';
import { predictionQueue, Job } from './queue';
import { VehicleClass } from '../../../contracts/enums';

interface UserPredictionPayload {
  userId: string;
  lat?: number;
  lng?: number;
  vehicleId?: string;
  force?: boolean;
}

// Track last evaluated timestamp per user to avoid alert spamming
const lastEvaluatedMap = new Map<string, number>();

/**
 * Worker handler for 'predict-user-savings'
 */
export async function handleUserPredictionJob(job: Job<UserPredictionPayload>): Promise<void> {
  const { userId, lat, lng, vehicleId, force } = job.data;

  // Rate limit notifications: at most 1 smart alert per user per 4 hours unless forced
  const now = Date.now();
  const lastTime = lastEvaluatedMap.get(userId) || 0;
  if (!force && now - lastTime < 4 * 60 * 60 * 1000) {
    return;
  }

  try {
    // 1. Fetch user & their vehicle
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        vehicles: true,
        bookings: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { station: true },
        },
      },
    });

    if (!user) return;

    const userVehicle = vehicleId
      ? user.vehicles.find((v) => v.id === vehicleId) || user.vehicles[0]
      : user.vehicles[0];

    // Determine user's active/last known GPS coordinates
    const userLat = lat || user.bookings[0]?.station?.lat || 23.0370;
    const userLng = lng || user.bookings[0]?.station?.lng || 72.5622;

    // 2. Fetch top candidate stations near user
    const stations = await prisma.station.findMany({
      where: { isActive: true },
      include: {
        operator: true,
        connectors: true,
        zone: true,
        pricingRules: true,
      },
      take: 15,
    });

    if (!stations.length) return;

    // 3. Query ML service for dynamic recommendations & savings
    const candidateStations = stations.map((s) => ({
      id: s.id,
      location: { lat: s.lat, lng: s.lng },
      connectors: s.connectors.map((c) => c.type),
      finalPricePerKwh: 6.5,
      provider: s.provider,
    }));

    const targetKwh = 20.0;
    const mlRecs = await mlClient.getRecommendations({
      origin: { lat: userLat, lng: userLng },
      vehicle: {
        vehicleClass: (userVehicle?.vehicleClass as VehicleClass) || VehicleClass.CAR,
        batteryKwh: userVehicle?.batteryKwh || 40.5,
        efficiencyWhKm: userVehicle?.efficiencyWhKm || 140,
        connectors: (userVehicle?.connectors as string[]) || ['ccs2'],
        currentChargePct: userVehicle?.currentChargePct || 40,
      },
      kwh: targetKwh,
      candidateStations,
    });

    // 4. Find the best dynamic deal
    const bestRec = mlRecs && mlRecs.length > 0 ? mlRecs[0] : null;

    if (bestRec) {
      const savings = Math.round(Math.max(50, bestRec.vsCheapestSticker || (targetKwh * 3.5)));
      const matchingStation = stations.find((s) => s.id === bestRec.station?.id) || stations[0];
      const availablePlugs = matchingStation.connectors.reduce((acc, c) => acc + c.availableCount, 0);

      // Trigger dynamic notification for this specific user
      await notificationsService.notifySmartSavings(
        user.id,
        matchingStation.id,
        matchingStation.name,
        savings,
        parseFloat(bestRec.distanceKm.toFixed(1)),
        availablePlugs
      );

      lastEvaluatedMap.set(userId, now);
      console.log(`[PredictionWorker] Dispatched personalized deal to user ${user.name} (${user.email}) for ${matchingStation.name} (Save ₹${savings})`);
    }
  } catch (error) {
    console.error(`[PredictionWorker] Error running prediction for user ${userId}:`, error);
  }
}

// Register the worker processor
predictionQueue.process<UserPredictionPayload>('predict-user-savings', handleUserPredictionJob);

/**
 * Dispatch prediction jobs for all registered users
 */
export async function dispatchAllUserPredictions(force = false): Promise<number> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        vehicles: { select: { id: true } },
      },
    });

    for (const user of users) {
      await predictionQueue.add<UserPredictionPayload>('predict-user-savings', {
        userId: user.id,
        vehicleId: user.vehicles[0]?.id,
        force,
      });
    }

    return users.length;
  } catch (err) {
    console.error('[PredictionWorker] Failed to dispatch predictions:', err);
    return 0;
  }
}

/**
 * Start the recurring background prediction worker (every 15 minutes)
 */
export function startPredictionWorker(): void {
  // Run on startup after 5 seconds delay
  setTimeout(() => {
    dispatchAllUserPredictions(false);
  }, 5000);

  // Run every 15 minutes
  setInterval(() => {
    dispatchAllUserPredictions(false);
  }, 15 * 60 * 1000);

  console.log('⚡ Background ML Prediction Worker started (interval: 15 mins)');
}
