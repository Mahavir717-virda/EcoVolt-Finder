import { Request, Response, NextFunction } from 'express';
import { ManagerService } from './manager.service';
import { UnauthorizedError } from '../../middleware/error-handler';

export class ManagerController {
  public static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) return next(new UnauthorizedError('Authentication required'));

    try {
      const profile = await ManagerService.getProfile(req.user.sub);
      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }

  public static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) return next(new UnauthorizedError('Authentication required'));

    try {
      const updated = await ManagerService.updateProfile(req.user.sub, req.body);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
}
