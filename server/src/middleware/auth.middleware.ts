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
 * Middleware: require valid Bearer JWT access token
 */
export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = AuthService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
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
