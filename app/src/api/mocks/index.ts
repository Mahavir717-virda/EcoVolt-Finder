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
import sessionActive from './data/session_active.json';
import bookings from './data/bookings.json';
import managerStations from './data/manager_stations.json';
import managerSessions from './data/manager_sessions.json';
import networkAnalytics from './data/network_analytics.json';

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
  'GET /sessions/active': sessionActive,
  'GET /bookings': bookings,
  'GET /manager/stations': managerStations,
  'GET /manager/sessions': managerSessions,
  'GET /analytics/network': networkAnalytics,
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
  if (method === 'GET' && (normalizedPath.startsWith('/sessions/') || normalizedPath === '/sessions')) {
    return sessionActive;
  }
  if (method === 'POST' && normalizedPath.includes('/sessions/') && normalizedPath.endsWith('/stop')) {
    return {
      ...sessionActive,
      status: 'completed',
      endedAt: new Date().toISOString(),
    };
  }
  if ((method === 'PATCH' || method === 'POST') && normalizedPath.includes('/bookings/') && normalizedPath.endsWith('/cancel')) {
    return {
      success: true,
      message: 'Booking cancelled successfully within grace window. Slot released.',
    };
  }
  if (normalizedPath.startsWith('/manager/stations') || normalizedPath.startsWith('/stations?manager')) {
    return managerStations;
  }
  if (normalizedPath.startsWith('/manager/pricing') || normalizedPath.startsWith('/pricing/station/')) {
    return {
      stationId: 'station-001',
      baseTariff: 5.50,
      providerMarkup: 0.50,
      dynamicGreenDiscount: true,
      maxGreenDiscount: 0.80,
      currency: 'INR',
    };
  }
  if (method === 'POST' && normalizedPath === '/manager/stations') {
    return {
      id: `station-${Date.now()}`,
      status: 'created',
    };
  }
  if (method === 'PATCH' && normalizedPath.includes('/connectors/') && normalizedPath.includes('/status')) {
    return {
      success: true,
      message: 'Connector status updated.',
    };
  }

  return null;
}
