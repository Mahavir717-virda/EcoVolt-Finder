import { Request, Response, NextFunction } from 'express';
import { GamificationService } from './gamification.service';
import { UnauthorizedError } from '../../middleware/error-handler';

export class GamificationController {
  /**
   * GET /impact/leaderboard
   * Get driver leaderboard rankings
   */
  public static async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user?.sub;
      const result = await GamificationService.getLeaderboard(currentUserId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /impact/gamification/me
   * Get current driver's gamification profile, score, streak & badges
   */
  public static async getMyGamification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const profile = await GamificationService.getUserGamificationProfile(req.user.sub);
      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }
}
