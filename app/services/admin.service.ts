/**
 * Network Admin API Service
 * Connects to /admin/... REST endpoints on EcoVolt backend.
 */

import { apiRequest } from './api';

export interface AdminNetworkOverview {
  totalUsers: number;
  totalOperators: number;
  totalStations: number;
  totalSessions: number;
  activeSessionsCount: number;
  completedSessionsCount: number;
  totalRevenue: number;
  totalEnergyKwh: number;
  totalCo2AvoidedKg: number;
  avgRenewablePct: number;
  currentLiveLoadKw: number;
  greenWindowShiftsCount: number;
  auditLogCount: number;
  dataQualityBreakdown: {
    livePct: number;
    cachedPct: number;
    forecastPct: number;
    mockPct: number;
  };
}

export interface AdminStationItem {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  provider: string;
  isActive: boolean;
  operatorName: string;
  operatorEmail?: string;
  connectorCount: number;
  baseTariff: number;
  providerMarkup: number;
  effectiveTariff: number;
  isReadOnlyForAdmin: boolean;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  suspendReason?: string;
  createdAt: string;
  isReadOnlyProfile: boolean;
  _count?: {
    bookings: number;
    sessions: number;
    vehicles: number;
  };
}

export interface AdminGridZone {
  id: string;
  name: string;
  state?: string;
  stationCount: number;
  activeStationsCount: number;
  dataQualitySource: string;
  confidenceScore: number;
  lastSync: string;
}

export interface AdminSystemHealth {
  status: string;
  serverUptimeSeconds: number;
  timestamp: string;
  services: {
    postgresql: { status: string; latencyMs: number };
    googleMapsApi: { status: string; quotaUsedPct: number };
    razorpayWebhook: { status: string; activeListeners: number };
    predictionWorker: { status: string; interval: string; lastRun: string };
    reminderWorker: { status: string; interval: string; lastRun: string };
  };
}

export interface AdminFinancials {
  totalVolumeInr: number;
  successfulTransactionsCount: number;
  failedTransactionsCount: number;
  failureRatePct: number;
  refundTotalInr: number;
  isReadOnly: boolean;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  targetId: string;
  adminEmail: string;
  adminName: string;
  reason?: string;
  timestamp: string;
}

export async function fetchAdminOverview(): Promise<AdminNetworkOverview> {
  return apiRequest<AdminNetworkOverview>('/admin/overview');
}

export async function fetchAdminStations(): Promise<AdminStationItem[]> {
  return apiRequest<AdminStationItem[]>('/admin/stations');
}

export async function updateAdminStationStatus(
  stationId: string,
  isActive: boolean,
  reason: string
): Promise<any> {
  return apiRequest(`/admin/stations/${stationId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ isActive, reason }),
  });
}

export async function fetchAdminUsers(): Promise<AdminUserItem[]> {
  return apiRequest<AdminUserItem[]>('/admin/users');
}

export async function updateAdminUserGovernance(
  userId: string,
  data: { role?: string; status?: string; reason: string }
): Promise<any> {
  return apiRequest(`/admin/users/${userId}/governance`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function fetchAdminZones(): Promise<AdminGridZone[]> {
  return apiRequest<AdminGridZone[]>('/admin/zones');
}

export async function fetchAdminHealth(): Promise<AdminSystemHealth> {
  return apiRequest<AdminSystemHealth>('/admin/health');
}

export async function fetchAdminFinancials(): Promise<AdminFinancials> {
  return apiRequest<AdminFinancials>('/admin/financials');
}

export async function fetchAdminConfig(): Promise<any> {
  return apiRequest('/admin/config');
}

export async function fetchAdminAuditLog(): Promise<AdminAuditLog[]> {
  return apiRequest<AdminAuditLog[]>('/admin/audit-log');
}

export async function createAdminUser(data: {
  name: string;
  email: string;
  password: string;
  role: string;
  reason: string;
}): Promise<any> {
  return apiRequest('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminUser(userId: string, reason: string): Promise<any> {
  return apiRequest(`/admin/users/${userId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}

export async function createAdminStation(data: {
  name: string;
  address: string;
  provider: string;
  lat?: number;
  lng?: number;
  reason: string;
}): Promise<any> {
  return apiRequest('/admin/stations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminStation(stationId: string, reason: string): Promise<any> {
  return apiRequest(`/admin/stations/${stationId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}
