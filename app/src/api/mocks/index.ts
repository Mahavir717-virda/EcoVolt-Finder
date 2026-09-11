// Mock Registry for ecoVolt-finder
import gridLive from './data/grid_live.json';
import gridForecast from './data/grid_forecast.json';
import stations from './data/stations.json';
import stationDetail from './data/station_detail.json';
import pricingQuote from './data/pricing_quote.json';
import recommend from './data/recommend.json';
import smartchargePlan from './data/smartcharge_plan.json';
import routeMatrix from './data/route_matrix.json';
import authLogin from './data/auth_login.json';
import me from './data/me.json';
import driverImpact from './data/driver_impact.json';
import vehicles from './data/vehicles.json';

export const mockRegistry: Record<string, unknown> = {
  'GET /grid/live': gridLive,
  'GET /grid/forecast': gridForecast,
  'GET /stations': stations,
  'GET /pricing/quote': pricingQuote,
  'GET /recommendations': recommend,
  'POST /recommend': recommend,
  'POST /smartcharge/plan': smartchargePlan,
  'POST /route/matrix': routeMatrix,
  'POST /auth/login': authLogin,
  'POST /auth/signup': authLogin,
  'POST /auth/refresh': {
    accessToken: 'mock_refreshed_jwt_access_token',
    refreshToken: 'mock_jwt_refresh_token_driver_101',
  },
  'GET /me': me,
  'GET /impact/me': driverImpact,
  'GET /vehicles': vehicles,
  'POST /bookings': {
    id: 'book_mock_101',
    stationId: 'station-001',
    connectorType: 'ccs2',
    userId: 'usr_driver_101',
    status: 'reserved',
    lockedPrice: 6.20,
    validUntil: new Date(Date.now() + 1800000).toISOString(),
    windowStart: '2026-09-12T12:00:00+05:30',
    windowEnd: '2026-09-12T13:30:00+05:30',
    createdAt: new Date().toISOString(),
  },
  'GET /bookings': [
    {
      id: 'book_mock_101',
      stationId: 'station-001',
      connectorType: 'ccs2',
      userId: 'usr_driver_101',
      status: 'reserved',
      lockedPrice: 6.20,
      validUntil: new Date(Date.now() + 1800000).toISOString(),
      windowStart: '2026-09-12T12:00:00+05:30',
      windowEnd: '2026-09-12T13:30:00+05:30',
      createdAt: new Date().toISOString(),
    },
  ],
};

export function getMockResponse(method: string, path: string): unknown | null {
  const normalizedPath = path.split('?')[0];
  const key = `${method.toUpperCase()} ${normalizedPath}`;

  if (mockRegistry[key]) {
    return mockRegistry[key];
  }

  // Dynamic route matchers
  if (method === 'GET' && normalizedPath.startsWith('/stations/')) {
    return stationDetail;
  }
  if (method === 'GET' && (normalizedPath.startsWith('/vehicles/') || normalizedPath === '/vehicles')) {
    return vehicles;
  }

  return null;
}
