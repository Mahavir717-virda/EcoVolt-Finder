import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../auth/auth.service';
import { updateMeSchema } from '../auth/auth.schema';
import { ValidationError, UnauthorizedError } from '../../middleware/error-handler';

export class MeController {
  public static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    try {
      const profile = await AuthService.getUserProfile(req.user.sub);
      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }

  public static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid profile update data', parsed.error.format()));
    }

    try {
      const updated = await AuthService.updateUserProfile(req.user.sub, parsed.data);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
}
