import { Request, Response, NextFunction } from 'express';
import { SessionsService } from './sessions.service';
import { stopSessionSchema } from './sessions.schema';
import { ValidationError, UnauthorizedError } from '../../middleware/error-handler';

export class SessionsController {
  public static async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    try {
      const rawId = req.params.id;
      const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;
      const session = await SessionsService.getSession(sessionId);
      res.status(200).json(session);
    } catch (err) {
      next(err);
    }
  }

  public static async startSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    try {
      const rawId = req.params.id;
      const bookingOrSessionId = Array.isArray(rawId) ? rawId[0] : rawId;
      const session = await SessionsService.startSession(req.user.sub, bookingOrSessionId);
      res.status(200).json(session);
    } catch (err) {
      next(err);
    }
  }

  public static async stopSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const parsed = stopSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid stop session payload', parsed.error.format()));
    }

    try {
      const rawId = req.params.id;
      const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;
      const session = await SessionsService.stopSession(req.user.sub, sessionId, parsed.data);
      res.status(200).json(session);
    } catch (err) {
      next(err);
    }
  }
}
