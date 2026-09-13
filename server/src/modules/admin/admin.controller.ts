import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { UnauthorizedError } from '../../middleware/error-handler';
import { Role } from '@prisma/client';

export class AdminController {
  private static getAdminUserId(req: Request): string {
    const userId = (req as any).user?.sub || (req as any).user?.id || (req as any).userId;
    if (!userId) throw new UnauthorizedError('Authentication required');
    return String(userId);
  }

  public static async getNetworkOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await AdminService.getNetworkOverview();
      res.status(200).json(overview);
    } catch (err) {
      next(err);
    }
  }

  public static async getStationRegistry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stations = await AdminService.getStationsList();
      res.status(200).json(stations);
    } catch (err) {
      next(err);
    }
  }

  public static async updateStationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = AdminController.getAdminUserId(req);
      const stationId = String(req.params.id);
      const { isActive, reason } = req.body;
      const updated = await AdminService.updateStationStatus(adminId, stationId, Boolean(isActive), String(reason || ''));
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async getUsersList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await AdminService.getUsersList();
      res.status(200).json(users);
    } catch (err) {
      next(err);
    }
  }

  public static async updateUserRoleAndStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = AdminController.getAdminUserId(req);
      const userId = String(req.params.id);
      const { role, status, reason } = req.body;
      const updated = await AdminService.updateUserGovernance(
        adminId,
        userId,
        role as Role,
        status as string,
        String(reason || '')
      );
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async getGridZones(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const zones = await AdminService.getGridZones();
      res.status(200).json(zones);
    } catch (err) {
      next(err);
    }
  }

  public static async getSystemHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await AdminService.getSystemHealth();
      res.status(200).json(health);
    } catch (err) {
      next(err);
    }
  }

  public static async getFinancialAggregates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const financials = await AdminService.getFinancialAggregates();
      res.status(200).json(financials);
    } catch (err) {
      next(err);
    }
  }

  public static async getPlatformConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await AdminService.getPlatformConfig();
      res.status(200).json(config);
    } catch (err) {
      next(err);
    }
  }

  public static async getAuditTrail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const logs = await AdminService.getAuditTrail();
      res.status(200).json(logs);
    } catch (err) {
      next(err);
    }
  }

  public static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = AdminController.getAdminUserId(req);
      const user = await AdminService.createUser(adminId, req.body);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  }

  public static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = AdminController.getAdminUserId(req);
      const userId = String(req.params.id);
      const reason = String(req.body?.reason || req.query?.reason || 'Administrative Deletion');
      const result = await AdminService.deleteUser(adminId, userId, reason);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async createStation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = AdminController.getAdminUserId(req);
      const station = await AdminService.createStation(adminId, req.body);
      res.status(201).json(station);
    } catch (err) {
      next(err);
    }
  }

  public static async deleteStation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = AdminController.getAdminUserId(req);
      const stationId = String(req.params.id);
      const reason = String(req.body?.reason || req.query?.reason || 'Administrative Removal');
      const result = await AdminService.deleteStation(adminId, stationId, reason);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
