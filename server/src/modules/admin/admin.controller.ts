import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { z } from 'zod';
import { BadRequestError } from '../../middleware/error-handler';
import { Role } from '@prisma/client';

export class AdminController {
  
  static getNetworkOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getNetworkOverview();
      res.json(data);
    } catch (err) { next(err); }
  };

  static getZoneDrilldown = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getZoneDrilldown(req.params.id as string);
      res.json(data);
    } catch (err) { next(err); }
  };

  static getOperators = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const take = parseInt(req.query.take as string) || 50;
      const data = await AdminService.getOperators(skip, take);
      res.json(data);
    } catch (err) { next(err); }
  };

  static getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const take = parseInt(req.query.take as string) || 50;
      const search = req.query.search as string;
      const data = await AdminService.getUsers(skip, take, search);
      res.json(data);
    } catch (err) { next(err); }
  };

  static updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({ role: z.nativeEnum(Role) });
      const { role } = schema.parse(req.body);
      const data = await AdminService.updateUserRole(req.user!.sub, req.params.id as string, role);
      res.json(data);
    } catch (err) { next(err); }
  };

  static suspendUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({ reason: z.string().min(3) });
      const { reason } = schema.parse(req.body);
      const data = await AdminService.suspendUser(req.user!.sub, req.params.id as string, reason);
      res.json(data);
    } catch (err) { next(err); }
  };

  static getStations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const take = parseInt(req.query.take as string) || 50;
      const data = await AdminService.getStations(skip, take);
      res.json(data);
    } catch (err) { next(err); }
  };

  static setStationPlatformStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({ status: z.enum(['active', 'flagged', 'deactivated']), reason: z.string().optional() });
      const { status, reason } = schema.parse(req.body);
      const data = await AdminService.setStationPlatformStatus(req.user!.sub, req.params.id as string, status, reason);
      res.json(data);
    } catch (err) { next(err); }
  };

  static getDataQuality = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getDataQuality();
      res.json(data);
    } catch (err) { next(err); }
  };

  static getSystemHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getSystemHealth();
      res.json(data);
    } catch (err) { next(err); }
  };

  static getPlatformAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getPlatformAnalytics();
      res.json(data);
    } catch (err) { next(err); }
  };

  static getFinancialOversight = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await AdminService.getFinancialOversight();
      res.json(data);
    } catch (err) { next(err); }
  };

  static getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const take = parseInt(req.query.take as string) || 50;
      const data = await AdminService.getAuditLogs(skip, take);
      res.json(data);
    } catch (err) { next(err); }
  };

}
