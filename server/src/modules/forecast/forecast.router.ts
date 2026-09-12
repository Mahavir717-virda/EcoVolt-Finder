import { Router } from 'express';
import { getForecast, getLiveGrid } from './forecast.controller';

export const forecastRouter = Router();

// GET /forecast?zoneId&stationId
forecastRouter.get('/', getForecast);

// GET /forecast/live?zoneId&stationId
forecastRouter.get('/live', getLiveGrid);
