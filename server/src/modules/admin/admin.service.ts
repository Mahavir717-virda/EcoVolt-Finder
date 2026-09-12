import { prisma } from '../../db/client';
import { Role } from '@prisma/client';
import axios from 'axios';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export class AdminService {
  /**
   * Log an administrative action to the AuditLog table
   */
  static async logAction(adminId: string, action: string, targetId: string, reason?: string) {
    return prisma.auditLog.create({
      data: {
        adminId,
        action,
        targetId,
        reason,
      },
    });
  }

  // ─── Network Overview & Zones ────────────────────────────────────────

  static async getNetworkOverview() {
    // Total live load, aggregate renewable share, shifted sessions
    const sessions = await prisma.session.findMany({
      where: { status: 'active' },
      select: { energyKwh: true, avgRenewablePct: true }
    });

    const totalLiveLoad = sessions.reduce((acc, s) => acc + (s.energyKwh || 0), 0);
    const avgRenewable = sessions.length > 0 
      ? sessions.reduce((acc, s) => acc + (s.avgRenewablePct || 0), 0) / sessions.length
      : 0;

    const shiftedSessionsCount = await prisma.session.count({
      where: { avgRenewablePct: { gt: 50 } } // Simplification for shifted
    });

    // We'd ideally pull zone flags from ML service
    let flaggedZones = [];
    try {
      const resp = await axios.get(`${ML_URL}/admin/zones/flagged`);
      flaggedZones = resp.data;
    } catch (e) {
      flaggedZones = [];
    }

    return {
      totalLiveLoadKw: totalLiveLoad,
      aggregateRenewablePct: avgRenewable,
      shiftedSessionsCount,
      flaggedZones,
    };
  }

  static async getZoneDrilldown(zoneId: string) {
    // Station mapping
    const stations = await prisma.station.findMany({
      where: { zoneId },
      include: { operator: true, connectors: true }
    });

    let liveGrid = null;
    let forecast = [];
    try {
      liveGrid = (await axios.get(`${ML_URL}/grid/live?zoneId=${zoneId}`)).data;
      forecast = (await axios.get(`${ML_URL}/grid/forecast?zoneId=${zoneId}&hours=24`)).data;
    } catch (e) {
      // Return empty if ML is unreachable
    }

    return {
      zoneId,
      liveGrid,
      forecast,
      stations,
      zoneMatchConfidence: 0.85 // Mocked for now
    };
  }

  // ─── Operator Oversight ──────────────────────────────────────────────

  static async getOperators(skip = 0, take = 50) {
    return prisma.operator.findMany({
      skip,
      take,
      include: {
        user: { select: { email: true, status: true } },
        stations: {
          include: { pricingRules: true }
        }
      }
    });
  }

  // ─── Users & Roles ───────────────────────────────────────────────────

  static async getUsers(skip = 0, take = 50, search?: string) {
    const where = search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {};
    return prisma.user.findMany({
      where,
      skip,
      take,
      select: { id: true, email: true, name: true, role: true, status: true, suspendReason: true, createdAt: true }
    });
  }

  static async updateUserRole(adminId: string, userId: string, role: Role) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, role: true, email: true }
    });
    await this.logAction(adminId, 'ROLE_CHANGE', userId, `Changed role to ${role}`);
    return user;
  }

  static async suspendUser(adminId: string, userId: string, suspendReason: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: 'suspended', suspendReason },
      select: { id: true, status: true, email: true }
    });
    await this.logAction(adminId, 'SUSPEND_USER', userId, suspendReason);
    return user;
  }

  // ─── Station Registry Governance ─────────────────────────────────────

  static async getStations(skip = 0, take = 50) {
    return prisma.station.findMany({
      skip,
      take,
      include: { operator: { select: { name: true } } }
    });
  }

  static async setStationPlatformStatus(adminId: string, stationId: string, status: string, reason?: string) {
    const station = await prisma.station.update({
      where: { id: stationId },
      data: { platformStatus: status }
    });
    await this.logAction(adminId, `STATION_STATUS_${status.toUpperCase()}`, stationId, reason);
    return station;
  }

  // ─── Data Quality & Ops ──────────────────────────────────────────────

  static async getDataQuality() {
    try {
      const resp = await axios.get(`${ML_URL}/admin/data-quality`);
      return resp.data;
    } catch (e) {
      return {
        tagDistribution: { live: 40, cached: 30, forecast: 20, mock: 10, stale: 0 },
        staleZones: [],
        anomalies: []
      };
    }
  }

  static async getSystemHealth() {
    // In a real scenario, these would fetch from respective services
    return {
      gridMode: {
        'IN-WE': 'live',
        'IN-NO': 'cached'
      },
      apiQuotas: {
        googleMaps: { used: 4500, limit: 10000 },
      },
      webhookHealth: {
        failuresRecent: 2,
        reconciliationJobsCaught: 5
      },
      backgroundJobs: {
        sessionSweeper: 'healthy'
      }
    };
  }

  // ─── Analytics & Finances (Read-only aggregates) ─────────────────────

  static async getPlatformAnalytics() {
    const totalSessions = await prisma.session.count({ where: { status: 'completed' } });
    const agg = await prisma.session.aggregate({
      where: { status: 'completed' },
      _sum: { cost: true, co2AvoidedKg: true }
    });
    
    const users = await prisma.user.count();
    const stations = await prisma.station.count();

    return {
      totalSessions,
      totalRevenueInr: agg._sum.cost || 0,
      totalCo2AvoidedKg: agg._sum.co2AvoidedKg || 0,
      totalDrivers: users,
      activeStations: stations,
    };
  }

  static async getFinancialOversight() {
    const paymentVolume = await prisma.session.aggregate({
      where: { status: 'completed' },
      _sum: { cost: true }
    });
    const failedSessions = await prisma.session.count({ where: { status: 'failed' } });
    return {
      paymentVolumeInr: paymentVolume._sum.cost || 0,
      failedPayments: failedSessions,
      refundTotalsInr: 15400 // Mock
    };
  }

  // ─── Audit Log ───────────────────────────────────────────────────────

  static async getAuditLogs(skip = 0, take = 50) {
    return prisma.auditLog.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { email: true, name: true } } }
    });
  }

}
