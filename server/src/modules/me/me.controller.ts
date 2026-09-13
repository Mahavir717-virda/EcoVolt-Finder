import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../auth/auth.service';
import { updateMeSchema } from '../auth/auth.schema';
import { ValidationError, UnauthorizedError, NotFoundError } from '../../middleware/error-handler';
import { prisma } from '../../db/client';

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

  /**
   * GET /me/favorites
   * Returns all favorited stations for the authenticated user
   */
  public static async getFavorites(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    try {
      const favorites = await prisma.favorite.findMany({
        where: { userId: req.user.sub },
        include: {
          station: {
            include: {
              connectors: true,
              operator: true,
              pricingRules: true,
              zone: { include: { tariffs: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json(favorites);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /me/favorites/:stationId
   * Add a station to favorites (idempotent — no error if already favorited)
   */
  public static async addFavorite(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const stationId = String(req.params.stationId);

    try {
      // Verify station exists
      const station = await prisma.station.findUnique({ where: { id: stationId } });
      if (!station) {
        return next(new NotFoundError(`Station not found: ${stationId}`));
      }

      const favorite = await prisma.favorite.upsert({
        where: { userId_stationId: { userId: req.user.sub, stationId } },
        update: {},
        create: { userId: req.user.sub, stationId },
        include: {
          station: {
            include: {
              connectors: true,
              operator: true,
              pricingRules: true,
              zone: { include: { tariffs: true } },
            },
          },
        },
      });

      res.status(201).json({ success: true, favorite });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /me/favorites/:stationId
   * Remove a station from favorites
   */
  public static async removeFavorite(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const stationId = String(req.params.stationId);

    try {
      await prisma.favorite.deleteMany({
        where: { userId: req.user.sub, stationId },
      });

      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

