import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { UnauthorizedError } from '../../middleware/error-handler';

export class AnalyticsController {
  /**
   * GET /impact/me
   */
  public static async getDriverImpact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const impact = await AnalyticsService.getDriverImpact(req.user.sub);
      res.status(200).json(impact);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /analytics/station/:id
   */
  public static async getStationAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const rawId = req.params.id;
      const stationId = Array.isArray(rawId) ? rawId[0] : rawId;
      const analytics = await AnalyticsService.getStationAnalytics(
        stationId,
        req.user.sub,
        req.user.role
      );
      res.status(200).json(analytics);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /analytics/network
   */
  public static async getNetworkAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const networkStats = await AnalyticsService.getNetworkAnalytics();
      res.status(200).json(networkStats);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /analytics/manager/dashboard
   */
  public static async getManagerDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const dashboard = await AnalyticsService.getManagerDashboard(req.user.sub);
      res.status(200).json(dashboard);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /analytics/manager/trends
   */
  public static async getManagerAnalyticsTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const trends = await AnalyticsService.getManagerAnalyticsTrends(req.user.sub);
      res.status(200).json(trends);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /analytics/manager/export
   */
  public static async exportManagerAnalyticsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const csvData = await AnalyticsService.exportManagerAnalyticsCsv(req.user.sub);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics_export.csv"');
      res.status(200).send(csvData);
    } catch (err) {
      next(err);
    }
  }
}
