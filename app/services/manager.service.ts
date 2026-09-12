/**
 * Mobile Manager API Service
 * Interacts with /manager/... endpoints on EcoVolt backend.
 * Includes seamless fallback mocks if offline or in dev demo mode.
 */

import { apiRequest } from './api';

export interface ManagerAnalytics {
  operatorName: string;
  totalStations: number;
  totalConnectors: number;
  activeSessionsCount: number;
  totalSessionsCount: number;
  totalRevenue: number;
  totalEnergyKwh: number;
  totalCo2AvoidedKg: number;
  utilizationPct: number;
  avgRenewablePct: number;
  gridAverageRenewablePct: number;
  demandChargeRisk: boolean;
  currentActiveLoadKw: number;
  maxTransformerKw: number;
}

export interface ManagerStation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  provider: string;
  isActive: boolean;
  status: string;
  maxTransformerKw?: number;
  connectors: Array<{
    id: string;
    type: string;
    powerKw: number;
    totalCount: number;
    availableCount: number;
    status: string;
  }>;
  pricingRules?: Array<{
    id: string;
    providerMarkup: number;
    enableDynamicDiscount: boolean;
    discountMaxKwh: number;
  }>;
}

export interface ManagerPricingItem {
  id?: string;
  stationId: string;
  stationName: string;
  baseTariff: number;
  pricingRule: {
    id?: string;
    providerMarkup: number;
    enableDynamicDiscount: boolean;
    discountMaxKwh: number;
    lowOccupancyDiscountInr?: number;
    occupancyThresholdPct?: number;
  };
  hourlyPreview: Array<{
    hour: string;
    price: number;
    isSolarPeak: boolean;
    isEveningPeak: boolean;
  }>;
}

export interface ManagerSession {
  id: string;
  bookingId: string;
  stationId: string;
  status: string;
  startedAt: string;
  energyKwh: number;
  cost: number;
  avgRenewablePct: number;
  refundStatus: string;
  disputeReason?: string;
  station: { name: string };
  connector: { type: string; powerKw: number };
  user: { name: string; email: string };
}

export async function fetchManagerAnalytics(): Promise<ManagerAnalytics> {
  try {
    return await apiRequest<ManagerAnalytics>('/manager/analytics');
  } catch {
    return {
      operatorName: 'Mahavir EV Charging Network',
      totalStations: 4,
      totalConnectors: 12,
      activeSessionsCount: 3,
      totalSessionsCount: 148,
      totalRevenue: 28450.0,
      totalEnergyKwh: 2180.4,
      totalCo2AvoidedKg: 1569.8,
      utilizationPct: 68,
      avgRenewablePct: 91.5,
      gridAverageRenewablePct: 42.0,
      demandChargeRisk: false,
      currentActiveLoadKw: 92.0,
      maxTransformerKw: 150.0,
    };
  }
}

export async function fetchManagerStations(): Promise<ManagerStation[]> {
  try {
    return await apiRequest<ManagerStation[]>('/manager/stations');
  } catch {
    return [
      {
        id: 'stn-001',
        name: 'Statiq Hub — SG Highway Sindhu Bhavan',
        address: 'Sindhu Bhavan Road, Bodakdev, Ahmedabad 380054',
        lat: 23.0441,
        lng: 72.5085,
        provider: 'torrent_power',
        isActive: true,
        status: 'active',
        maxTransformerKw: 150,
        connectors: [
          { id: 'conn-1', type: 'ccs2', powerKw: 60, totalCount: 4, availableCount: 3, status: 'available' },
          { id: 'conn-2', type: 'type2_ac', powerKw: 22, totalCount: 2, availableCount: 2, status: 'available' },
        ],
      },
      {
        id: 'stn-002',
        name: 'Tata EZ Charge — Prahlad Nagar Corporate',
        address: 'Prahlad Nagar Corporate Road, Ahmedabad 380015',
        lat: 23.0125,
        lng: 72.5112,
        provider: 'adani_energy',
        isActive: true,
        status: 'active',
        maxTransformerKw: 120,
        connectors: [
          { id: 'conn-3', type: 'ccs2', powerKw: 120, totalCount: 2, availableCount: 1, status: 'occupied' },
          { id: 'conn-4', type: 'bharat_dc_001', powerKw: 15, totalCount: 2, availableCount: 0, status: 'maintenance' },
        ],
      },
    ];
  }
}

export async function createManagerStation(data: any): Promise<ManagerStation> {
  return apiRequest<ManagerStation>('/manager/stations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateConnectorStatus(connectorId: string, status: string): Promise<any> {
  return apiRequest(`/manager/connectors/${connectorId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function fetchManagerPricing(): Promise<ManagerPricingItem[]> {
  try {
    return await apiRequest<ManagerPricingItem[]>('/manager/pricing');
  } catch {
    return [
      {
        stationId: 'stn-001',
        stationName: 'Statiq Hub — SG Highway Sindhu Bhavan',
        baseTariff: 13.5,
        pricingRule: {
          providerMarkup: 3.5,
          enableDynamicDiscount: true,
          discountMaxKwh: 3.0,
        },
        hourlyPreview: Array.from({ length: 24 }, (_, h) => ({
          hour: `${h.toString().padStart(2, '0')}:00`,
          price: h >= 11 && h <= 15 ? 14.0 : h >= 18 && h <= 22 ? 19.5 : 17.0,
          isSolarPeak: h >= 11 && h <= 15,
          isEveningPeak: h >= 18 && h <= 22,
        })),
      },
    ];
  }
}

export async function createPricingRule(data: any): Promise<any> {
  return apiRequest('/manager/pricing', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePricingRule(stationIdOrRuleId: string, data: any): Promise<any> {
  return apiRequest(`/manager/pricing/${stationIdOrRuleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePricingRule(ruleIdOrStationId: string): Promise<any> {
  return apiRequest(`/manager/pricing/${ruleIdOrStationId}`, {
    method: 'DELETE',
  });
}

export async function fetchManagerSessions(): Promise<ManagerSession[]> {
  try {
    return await apiRequest<ManagerSession[]>('/manager/sessions');
  } catch {
    return [
      {
        id: 'sess-101',
        bookingId: 'bk-501',
        stationId: 'stn-001',
        status: 'active',
        startedAt: new Date().toISOString(),
        energyKwh: 14.2,
        cost: 241.4,
        avgRenewablePct: 94.0,
        refundStatus: 'none',
        station: { name: 'Statiq Hub — SG Highway' },
        connector: { type: 'ccs2', powerKw: 60 },
        user: { name: 'Aarav Patel', email: 'driver@ecovolt.in' },
      },
      {
        id: 'sess-102',
        bookingId: 'bk-502',
        stationId: 'stn-002',
        status: 'completed',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        energyKwh: 28.5,
        cost: 484.5,
        avgRenewablePct: 88.5,
        refundStatus: 'none',
        station: { name: 'Tata EZ Charge — Prahlad Nagar' },
        connector: { type: 'ccs2', powerKw: 120 },
        user: { name: 'Priya Nair', email: 'priya@demo.ecovolt.in' },
      },
    ];
  }
}

export async function forceStopSession(sessionId: string): Promise<any> {
  return apiRequest(`/manager/sessions/${sessionId}/force-stop`, { method: 'POST' });
}

export async function refundSession(sessionId: string, reason: string): Promise<any> {
  return apiRequest(`/manager/sessions/${sessionId}/refund`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function freeStuckConnector(bookingId: string): Promise<any> {
  return apiRequest(`/manager/bookings/${bookingId}/free-connector`, { method: 'POST' });
}

export async function fetchManagerPayout(): Promise<any> {
  try {
    return await apiRequest('/manager/profile');
  } catch {
    return {
      name: 'Mahavir EV Charging Network',
      contactEmail: 'mahavir@gmail.com',
      payoutBankDetails: {
        accountName: 'Mahavir Virda',
        bankName: 'HDFC Bank',
        accountNumber: '50100492817263',
        ifscCode: 'HDFC0000240',
      },
      notificationPrefs: {
        emailAlerts: true,
        outageAlerts: true,
        occupancySpikes: true,
      },
    };
  }
}

export async function updateManagerPayout(data: any): Promise<any> {
  return apiRequest('/manager/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
