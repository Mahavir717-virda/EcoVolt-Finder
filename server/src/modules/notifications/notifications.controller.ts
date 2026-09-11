import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { NotificationsService } from './notifications.service';
import { BadRequestError, UnauthorizedError } from '../../middleware/error-handler';

const pushTokenSchema = z.object({
  token: z.string().min(1, 'token is required'),
});

export class NotificationsController {
  /**
   * POST /notifications/token
   * Register or update Expo push token for current user
   */
  public static async registerToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const parsed = pushTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError('Invalid push token data', parsed.error.format());
      }

      NotificationsService.registerPushToken(req.user.sub, parsed.data.token);
      res.status(200).json({ success: true, message: 'Push token registered successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /notifications
   * Retrieve notification history for current user
   */
  public static async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const history = NotificationsService.getHistory(req.user.sub);
      res.status(200).json(history);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /notifications/:id/read
   * Mark a notification as read
   */
  public static async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const rawId = req.params.id;
      const notificationId = Array.isArray(rawId) ? rawId[0] : rawId;
      const updated = NotificationsService.markAsRead(req.user.sub, notificationId);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
}
