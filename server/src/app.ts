import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import yaml from 'yamljs';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { requestLogger } from './middleware/request-logger';
import { baseRateLimiter } from './middleware/rate-limiter';
import { errorHandler, NotFoundError } from './middleware/error-handler';
import { healthRouter } from './modules/health/health.router';
import { authRouter } from './modules/auth/auth.router';
import { meRouter } from './modules/me/me.router';
import { vehiclesRouter } from './modules/vehicles/vehicles.router';
import { stationsRouter } from './modules/stations/stations.router';
import { pricingRouter } from './modules/pricing/pricing.router';
import { bookingsRouter } from './modules/bookings/bookings.router';
import { sessionsRouter } from './modules/sessions/sessions.router';
import { recommendationsRouter } from './modules/recommendations/recommendations.router';
import { forecastRouter } from './modules/forecast/forecast.router';
import { impactRouter, analyticsRouter } from './modules/analytics/analytics.router';

export const createApp = (): Express => {
  const app = express();

  // Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (env.CORS_ORIGINS.includes('*') || env.CORS_ORIGINS.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Rate Limiting
  app.use(baseRateLimiter);

  // Body Parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request Logging
  app.use(requestLogger);

  // Mount OpenAPI / Swagger UI at /docs directly from /contracts/openapi.node.yaml
  const openApiPath = path.resolve(__dirname, '../../contracts/openapi.node.yaml');
  if (fs.existsSync(openApiPath)) {
    try {
      const swaggerDocument = yaml.load(openApiPath);
      app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    } catch (e) {
      console.warn('Failed to parse OpenAPI yaml for /docs:', e);
    }
  }

  // Routes
  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/me', meRouter);
  app.use('/vehicles', vehiclesRouter);
  app.use('/stations', stationsRouter);
  app.use('/pricing', pricingRouter);
  app.use('/bookings', bookingsRouter);
  app.use('/sessions', sessionsRouter);
  app.use('/recommendations', recommendationsRouter);
  app.use('/forecast', forecastRouter);
  app.use('/impact', impactRouter);
  app.use('/analytics', analyticsRouter);

  // 404 Handler
  app.use((req, _res, next) => {
    next(new NotFoundError(`Cannot ${req.method} ${req.path}`));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
