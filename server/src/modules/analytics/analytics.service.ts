import { prisma } from '../../db/client';
import { DriverImpact } from '../../../../contracts/types';
import { ForbiddenError, NotFoundError } from '../../middleware/error-handler';

export class AnalyticsService {
  /**
   * Driver lifetime impact aggregates
   * GET /impact/me
   */
  public static async getDriverImpact(userId: string): Promise<DriverImpact> {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        status: 'completed',
      },
      include: {
        booking: true,
      },
    });

    if (!sessions.length) {
      return {
        userId,
        totalSessions: 0,
        totalKwh: 0,
        totalSpent: 0,
        savedVsSticker: 0,
        co2AvoidedKg: 0,
        avgRenewablePct: 0,
      };
    }

    let totalKwh = 0;
    let totalSpent = 0;
    let totalStickerCost = 0;
    let co2AvoidedKg = 0;
    let weightedRenewableSum = 0;

    for (const session of sessions) {
      const kwh = session.energyKwh || 0;
      const cost = session.cost || 0;
      const renPct = session.avgRenewablePct || 0;
      const co2 = session.co2AvoidedKg || 0;

      totalKwh += kwh;
      totalSpent += cost;
      co2AvoidedKg += co2;
      weightedRenewableSum += renPct * kwh;

      // Extract baseTariff from lockedPrice snapshot if available, or nominal 8.5 ₹/kWh sticker
      let baseRate = 8.5;
      if (session.booking && session.booking.lockedPrice) {
        const locked = session.booking.lockedPrice as any;
        if (locked.baseTariff) {
          baseRate = Number(locked.baseTariff);
        }
      }
      totalStickerCost += kwh * baseRate;
    }

    const savedVsSticker = Math.max(0, Number((totalStickerCost - totalSpent).toFixed(2)));
    const avgRenewablePct = totalKwh > 0
      ? Number((weightedRenewableSum / totalKwh).toFixed(1))
      : Number((sessions.reduce((acc, s) => acc + (s.avgRenewablePct || 0), 0) / sessions.length).toFixed(1));

    return {
      userId,
      totalSessions: sessions.length,
      totalKwh: Number(totalKwh.toFixed(2)),
      totalSpent: Number(totalSpent.toFixed(2)),
      savedVsSticker,
      co2AvoidedKg: Number(co2AvoidedKg.toFixed(2)),
      avgRenewablePct,
    };
  }

  /**
   * Station-level analytics for Managers (owner-scoped)
   * GET /analytics/station/:id
   * Edge Case #16: Demand-charge risk calculation
   * Edge Case #22: Ownership verification
   */
  public static async getStationAnalytics(stationId: string, userId: string, role: string) {
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: {
        operator: true,
        connectors: true,
        sessions: {
          include: {
            booking: true,
          },
        },
      },
    });

    if (!station) {
      throw new NotFoundError('Station not found');
    }

    // Role & Ownership check (Admin can view all, Manager must own)
    if (role !== 'admin' && station.operator.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view analytics for this station');
    }

    const completedSessions = station.sessions.filter((s) => s.status === 'completed');
    const activeSessions = station.sessions.filter((s) => s.status === 'active');

    const totalRevenue = completedSessions.reduce((sum, s) => sum + (s.cost || 0), 0);
    const totalKwh = completedSessions.reduce((sum, s) => sum + (s.energyKwh || 0), 0);

    const avgRenewablePct = completedSessions.length > 0
      ? Number(
          (
            completedSessions.reduce((sum, s) => sum + (s.avgRenewablePct || 70), 0) /
            completedSessions.length
          ).toFixed(1)
        )
      : 70;

    // Demand-charge calculations
    // Total installed capacity in kW
    const totalInstalledKw = station.connectors.reduce(
      (sum, c) => sum + c.powerKw * c.totalCount,
      0
    );

    // Active concurrent load kW
    let currentLoadKw = 0;
    for (const act of activeSessions) {
      const conn = station.connectors.find((c) => c.id === act.connectorId);
      currentLoadKw += conn ? conn.powerKw : 30;
    }

    // Configured peak threshold: 80% of installed capacity
    const peakThresholdKw = Number((totalInstalledKw * 0.8).toFixed(1));

    let demandChargeRisk: 'low' | 'medium' | 'high' = 'low';
    if (currentLoadKw >= peakThresholdKw) {
      demandChargeRisk = 'high';
    } else if (currentLoadKw >= peakThresholdKw * 0.6) {
      demandChargeRisk = 'medium';
    }

    // Utilization rate = (available connectors / total connectors)
    const totalConnectorUnits = station.connectors.reduce((sum, c) => sum + c.totalCount, 0);
    const availableConnectorUnits = station.connectors.reduce((sum, c) => sum + c.availableCount, 0);
    const utilizationPct = totalConnectorUnits > 0
      ? Number((((totalConnectorUnits - availableConnectorUnits) / totalConnectorUnits) * 100).toFixed(1))
      : 0;

    return {
      stationId: station.id,
      stationName: station.name,
      totalSessions: completedSessions.length,
      activeSessions: activeSessions.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalKwh: Number(totalKwh.toFixed(2)),
      avgRenewablePct,
      utilizationPct,
      demandCharge: {
        currentLoadKw,
        peakThresholdKw,
        totalInstalledKw,
        risk: demandChargeRisk,
      },
    };
  }

  /**
   * Network-wide macro metrics for Admin
   * GET /analytics/network
   */
  public static async getNetworkAnalytics() {
    const [totalStations, totalSessions, completedSessionsList, activeSessionsCount] = await Promise.all([
      prisma.station.count(),
      prisma.session.count(),
      prisma.session.findMany({
        where: { status: 'completed' },
      }),
      prisma.session.count({
        where: { status: 'active' },
      }),
    ]);

    const totalRevenue = completedSessionsList.reduce((sum, s) => sum + (s.cost || 0), 0);
    const totalKwh = completedSessionsList.reduce((sum, s) => sum + (s.energyKwh || 0), 0);
    const totalCo2Avoided = completedSessionsList.reduce((sum, s) => sum + (s.co2AvoidedKg || 0), 0);

    const aggregateRenewableShare = completedSessionsList.length > 0
      ? Number(
          (
            completedSessionsList.reduce((sum, s) => sum + (s.avgRenewablePct || 65), 0) /
            completedSessionsList.length
          ).toFixed(1)
        )
      : 72.5;

    // Estimate sessions shifted into green windows (avg renewable >= 75%)
    const sessionsShiftedToGreen = completedSessionsList.filter(
      (s) => (s.avgRenewablePct || 0) >= 75
    ).length;

    return {
      totalStations,
      totalSessions,
      activeSessionsCount,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalKwh: Number(totalKwh.toFixed(2)),
      totalCo2AvoidedKg: Number(totalCo2Avoided.toFixed(2)),
      aggregateRenewableShare,
      sessionsShiftedToGreen,
    };
  }

  /**
   * Manager Dashboard aggregates
   * GET /analytics/manager/dashboard
   */
  public static async getManagerDashboard(userId: string) {
    const operator = await prisma.operator.findFirst({
      where: { userId },
      include: {
        stations: {
          include: {
            connectors: true,
            sessions: {
              where: {
                // Today's sessions approximately
                createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
              }
            }
          }
        }
      }
    });

    if (!operator) {
      // Return zeroes if no operator setup yet
      return {
        liveOccupancyPct: 0,
        todayRevenue: 0,
        currentRenewableShare: 0,
        demandChargeRisk: 'low',
        quickAlerts: []
      };
    }

    let todayRevenue = 0;
    let activeSessionsCount = 0;
    let totalInstalledKw = 0;
    let currentLoadKw = 0;
    let totalConnectors = 0;
    let availableConnectors = 0;
    let weightedRenewableSum = 0;
    let totalKwh = 0;
    const quickAlerts: any[] = [];

    for (const station of operator.stations) {
      for (const connector of station.connectors) {
        totalConnectors += connector.totalCount;
        availableConnectors += connector.availableCount;
        totalInstalledKw += connector.powerKw * connector.totalCount;
        if (connector.status === 'offline' || connector.status === 'maintenance') {
          quickAlerts.push({ type: 'offline_connector', stationName: station.name, connectorId: connector.id });
        }
      }

      for (const session of station.sessions) {
        if (session.status === 'completed') {
          todayRevenue += (session.cost || 0);
          const kwh = session.energyKwh || 0;
          totalKwh += kwh;
          weightedRenewableSum += (session.avgRenewablePct || 0) * kwh;
        } else if (session.status === 'active') {
          activeSessionsCount++;
          const conn = station.connectors.find(c => c.id === session.connectorId);
          currentLoadKw += conn ? conn.powerKw : 30;
        }
        
        if (session.disputeReason) {
          quickAlerts.push({ type: 'disputed_session', stationName: station.name, sessionId: session.id, reason: session.disputeReason });
        }
      }
    }

    const avgRenewablePct = totalKwh > 0 ? Number((weightedRenewableSum / totalKwh).toFixed(1)) : 0;
    const occupancyPct = totalConnectors > 0 ? Number((((totalConnectors - availableConnectors) / totalConnectors) * 100).toFixed(1)) : 0;
    const peakThresholdKw = Number((totalInstalledKw * 0.8).toFixed(1));
    
    let demandChargeRisk: 'low' | 'medium' | 'high' = 'low';
    if (currentLoadKw >= peakThresholdKw && peakThresholdKw > 0) {
      demandChargeRisk = 'high';
    } else if (currentLoadKw >= peakThresholdKw * 0.6 && peakThresholdKw > 0) {
      demandChargeRisk = 'medium';
    }

    return {
      liveOccupancyPct: occupancyPct,
      todayRevenue: Number(todayRevenue.toFixed(2)),
      currentRenewableShare: avgRenewablePct,
      demandChargeRisk,
      quickAlerts
    };
  }

  /**
   * Manager Analytics Trends
   * GET /analytics/manager/trends
   */
  public static async getManagerAnalyticsTrends(userId: string) {
    const operator = await prisma.operator.findFirst({
      where: { userId },
      include: {
        stations: {
          include: {
            sessions: {
              where: {
                status: 'completed',
                // Last 30 days
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
              }
            }
          }
        }
      }
    });

    if (!operator) {
      return { trends: [] };
    }

    // Group by day
    const trendsByDay: Record<string, any> = {};

    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      trendsByDay[dateStr] = {
        date: dateStr,
        utilization: 0,
        revenue: 0,
        renewableShare: 0,
        avgPrice: 0,
        demandPeakKw: 0,
        _totalKwh: 0,
        _sessionCount: 0
      };
    }

    operator.stations.forEach(station => {
      station.sessions.forEach(session => {
        const dateStr = session.createdAt.toISOString().split('T')[0];
        if (trendsByDay[dateStr]) {
          trendsByDay[dateStr].revenue += (session.cost || 0);
          trendsByDay[dateStr].utilization += 1; // 1 session = 1 unit of utilization for this simple chart
          trendsByDay[dateStr]._totalKwh += (session.energyKwh || 0);
          trendsByDay[dateStr].renewableShare += ((session.avgRenewablePct || 0) * (session.energyKwh || 0));
          trendsByDay[dateStr]._sessionCount += 1;
        }
      });
    });

    const trends = Object.values(trendsByDay).map(day => {
      if (day._totalKwh > 0) {
        day.renewableShare = Number((day.renewableShare / day._totalKwh).toFixed(1));
        day.avgPrice = Number((day.revenue / day._totalKwh).toFixed(2));
      } else {
        day.renewableShare = 0;
        day.avgPrice = 0;
      }
      
      // Mock demand peak kw between 80 and 150 for demo purposes
      day.demandPeakKw = Math.round(80 + Math.random() * 70);

      delete day._totalKwh;
      delete day._sessionCount;
      return day;
    });

    return { trends };
  }

  /**
   * Manager Analytics CSV Export
   * GET /analytics/manager/export
   */
  public static async exportManagerAnalyticsCsv(userId: string) {
    const operator = await prisma.operator.findFirst({
      where: { userId },
      include: {
        stations: {
          include: {
            sessions: {
              where: { status: 'completed' },
              include: { connector: true, vehicle: true }
            }
          }
        }
      }
    });

    if (!operator) {
      return 'Session ID,Station,Date,Energy (kWh),Revenue (INR),Renewable Share (%)\n';
    }

    let csv = 'Session ID,Station,Date,Energy (kWh),Revenue (INR),Renewable Share (%)\n';
    operator.stations.forEach(station => {
      station.sessions.forEach(session => {
        const dateStr = session.createdAt.toISOString().split('T')[0];
        csv += `${session.id},${station.name},${dateStr},${session.energyKwh},${session.cost},${session.avgRenewablePct}\n`;
      });
    });

    return csv;
  }
}
