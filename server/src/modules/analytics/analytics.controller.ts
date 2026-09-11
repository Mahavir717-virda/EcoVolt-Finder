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
}
