import { Router } from 'express';
import { getForecast } from './forecast.controller';

export const forecastRouter = Router();

// GET /forecast?zoneId&stationId
forecastRouter.get('/', getForecast);
