import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthService, TokenPayload } from '../modules/auth/auth.service';
import { UnauthorizedError, ForbiddenError, NotFoundError } from './error-handler';
import { prisma } from '../db/client';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware: require valid Bearer JWT access token and active user
 */
export const requireAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = AuthService.verifyAccessToken(token);

    // Verify user exists in database
    let user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });

    // Graceful self-healing for reseeded/migrated databases:
    // If UUID changed during a re-seed but user email matches an existing account
    if (!user && payload.email) {
      user = await prisma.user.findUnique({
        where: { email: payload.email.toLowerCase() },
        select: { id: true, email: true, role: true },
      });
    }

    if (!user) {
      return next(new UnauthorizedError('User session expired or user no longer exists. Please sign in again.'));
    }

    req.user = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: optional Bearer JWT access token
 * If present and valid, populates req.user. If absent or invalid, silently continues.
 */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = AuthService.verifyAccessToken(token);
      let user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true },
      });

      if (!user && payload.email) {
        user = await prisma.user.findUnique({
          where: { email: payload.email.toLowerCase() },
          select: { id: true, email: true, role: true },
        });
      }

      if (user) {
        req.user = {
          sub: user.id,
          email: user.email,
          role: user.role,
        };
      }
    } catch {
      // Silently continue without user
    }
  }
  next();
};


/**
 * Middleware: require specific role (e.g. manager, admin)
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(`Access forbidden: Requires one of [${allowedRoles.join(', ')}] role`)
      );
    }

    next();
  };
};

/**
 * Middleware: require Station Ownership
 * Edge Case #22: A manager may ONLY mutate their own operator's stations. Admins can mutate all.
 */
export const requireStationOwnership = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  // Admin bypasses ownership check
  if (req.user.role === Role.admin) {
    return next();
  }

  const rawStationId = req.params.stationId || req.params.id;
  const stationId = Array.isArray(rawStationId) ? rawStationId[0] : rawStationId;

  if (!stationId) {
    return next();
  }

  try {
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: {
        operator: true,
      },
    });

    if (!station) {
      return next(new NotFoundError(`Station not found with id: ${stationId}`));
    }

    if (station.operator.userId !== req.user.sub) {
      return next(
        new ForbiddenError('You do not have permission to modify this charging station')
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};
