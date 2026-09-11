// Mock Registry for ecoVolt-finder
import gridLive from '../../../../contracts/examples/grid_live.json';
import gridForecast from '../../../../contracts/examples/grid_forecast.json';
import stations from '../../../../contracts/examples/stations.json';
import stationDetail from '../../../../contracts/examples/station_detail.json';
import pricingQuote from '../../../../contracts/examples/pricing_quote.json';
import recommend from '../../../../contracts/examples/recommend.json';
import smartchargePlan from '../../../../contracts/examples/smartcharge_plan.json';
import routeMatrix from '../../../../contracts/examples/route_matrix.json';
import authLogin from '../../../../contracts/examples/auth_login.json';
import me from '../../../../contracts/examples/me.json';
import driverImpact from '../../../../contracts/examples/driver_impact.json';
import vehicles from '../../../../contracts/examples/vehicles.json';

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
  if (method === 'GET' && normalizedPath.startsWith('/vehicles/')) {
    return vehicles[0];
  }

  return null;
}
