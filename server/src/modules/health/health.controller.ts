import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/client';

export class HealthController {
  public static async getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    try {
      // Test database connectivity
      await prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - startTime;

      res.status(200).json({
        status: 'ok',
        service: 'ecovolt-server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        database: {
          status: 'connected',
          latencyMs,
        },
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        service: 'ecovolt-server',
        timestamp: new Date().toISOString(),
        database: {
          status: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown database error',
        },
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'PostgreSQL database connection failed',
        },
      });
    }
  }
}
