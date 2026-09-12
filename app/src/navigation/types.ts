import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Intro: undefined;
  RoleSelect: undefined;
  Login: { role?: 'driver' | 'manager' | 'admin' } | undefined;
  Signup: { role?: 'driver' | 'manager' | 'admin' } | undefined;
  VerifyOtp: { email: string };
};

export type DriverTabParamList = {
  Reservations: undefined;
  Vehicle: undefined;
  Home: undefined;
  Saved: undefined;
  Profile: undefined;
  // Backward-compat aliases
  Explore?: undefined;
  SmartCharge?: undefined;
  Activity?: undefined;
};

export type DriverStackParamList = {
  DriverTabs: NavigatorScreenParams<DriverTabParamList>;
  StationDetail: { stationId: string };
  RouteCompare: { stationId: string; originLat?: number; originLng?: number };
  BookingConfirm: { stationId: string; connectorType?: string; windowStart?: string; durationMinutes?: number };
  SessionSummary: { sessionId: string };
  SlotAvailability: { stationId: string; connectorType?: string; windowStart?: string; windowEnd?: string };
  Bookings: undefined;
  Impact: undefined;
  Vehicles: undefined;
  Profile: undefined;
};

export type ManagerStackParamList = {
  ManagerDashboard: undefined;
  StationList: undefined;
  StationForm: { stationId?: string } | undefined;
  PricingControls: { stationId: string };
  LiveSessions: undefined;
  ManagerAnalytics: undefined;
  Profile: undefined;
};

export type AdminStackParamList = {
  AdminOverview: undefined;
  ZoneDetail: { zoneId: string };
  NetworkAnalytics: undefined;
  OperatorOversight: undefined;
  DataQuality: undefined;
  UserManagement: undefined;
  StationRegistry: undefined;
  SystemHealth: undefined;
  AuditLog: undefined;
  ComplianceSecurity: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Driver: NavigatorScreenParams<DriverStackParamList>;
  Manager: NavigatorScreenParams<ManagerStackParamList>;
  Admin: NavigatorScreenParams<AdminStackParamList>;
};
