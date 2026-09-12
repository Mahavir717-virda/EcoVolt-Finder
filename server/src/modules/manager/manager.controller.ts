import { Request, Response, NextFunction } from 'express';
import { ManagerService } from './manager.service';
import { UnauthorizedError } from '../../middleware/error-handler';

export class ManagerController {
  private static getUserId(req: Request): string {
    const userId = (req as any).user?.sub || (req as any).user?.id || (req as any).userId;
    if (!userId) throw new UnauthorizedError('Authentication required');
    return String(userId);
  }

  public static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ManagerController.getUserId(req);
      const profile = await ManagerService.getProfile(userId);
      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }

  public static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ManagerController.getUserId(req);
      const updated = await ManagerService.updateProfile(userId, req.body);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ManagerController.getUserId(req);
      const analytics = await ManagerService.getAnalytics(userId);
      res.status(200).json(analytics);
    } catch (err) {
      next(err);
    }
  }

  public static async getStations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ManagerController.getUserId(req);
      const stations = await ManagerService.getStations(userId);
      res.status(200).json(stations);
    } catch (err) {
      next(err);
    }
  }

  public static async createStation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ManagerController.getUserId(req);
      const station = await ManagerService.createStation(userId, req.body);
      res.status(201).json(station);
    } catch (err) {
      next(err);
    }
  }

  public static async updateConnectorStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ManagerController.getUserId(req);
      const id = String(req.params.id);
      const status = String(req.body.status || 'available');
      const updated = await ManagerService.updateConnectorStatus(userId, id, status);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async getPricing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ManagerController.getUserId(req);
      const pricing = await ManagerService.getPricing(userId);
      res.status(200).json(pricing);
    } catch (err) {
      next(err);
    }
  }

  public static async createPricingRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ManagerController.getUserId(req);
      const created = await ManagerService.createPricingRule(userId, req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  public static async updatePricingRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ManagerController.getUserId(req);
      const stationId = String(req.params.stationId);
      const updated = await ManagerService.updatePricingRule(userId, stationId, req.body);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async deletePricingRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ManagerController.getUserId(req);
      const id = String(req.params.id);
      const result = await ManagerService.deletePricingRule(userId, id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ManagerController.getUserId(req);
      const sessions = await ManagerService.getSessions(userId);
      res.status(200).json(sessions);
    } catch (err) {
      next(err);
    }
  }

  public static async forceStopSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ManagerController.getUserId(req);
      const id = String(req.params.id);
      const stopped = await ManagerService.forceStopSession(userId, id);
      res.status(200).json(stopped);
    } catch (err) {
      next(err);
    }
  }

  public static async refundSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ManagerController.getUserId(req);
      const id = String(req.params.id);
      const reason = req.body.reason ? String(req.body.reason) : undefined;
      const refunded = await ManagerService.refundSession(userId, id, reason);
      res.status(200).json(refunded);
    } catch (err) {
      next(err);
    }
  }

  public static async getBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ManagerController.getUserId(req);
      const bookings = await ManagerService.getBookings(userId);
      res.status(200).json(bookings);
    } catch (err) {
      next(err);
    }
  }

  public static async freeStuckConnector(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = ManagerController.getUserId(req);
      const id = String(req.params.id);
      const result = await ManagerService.freeStuckConnector(userId, id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
