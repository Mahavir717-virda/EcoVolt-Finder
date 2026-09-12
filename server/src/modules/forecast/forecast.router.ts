import { Router } from 'express';
import { getForecast, getLiveGrid } from './forecast.controller';

export const forecastRouter = Router();

// GET /forecast?zoneId&stationId
forecastRouter.get('/', getForecast);
forecastRouter.get('/forecast', getForecast);
forecastRouter.get('/live', getLiveGrid);

export const gridRouter = Router();
gridRouter.get('/live', getLiveGrid);
gridRouter.get('/forecast', getForecast);
