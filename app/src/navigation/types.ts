import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Intro: undefined;
  RoleSelect: undefined;
  Login: { role?: 'driver' | 'manager' | 'admin' } | undefined;
  Signup: { role?: 'driver' | 'manager' | 'admin' } | undefined;
  VerifyOtp: { email: string };
};

export type DriverTabParamList = {
  Explore: undefined;
  SmartCharge: undefined;
  Activity: undefined;
  Profile: undefined;
};

export type DriverStackParamList = {
  DriverTabs: NavigatorScreenParams<DriverTabParamList>;
  StationDetail: { stationId: string };
  RouteCompare: { stationId: string; originLat?: number; originLng?: number };
  BookingConfirm: { stationId: string; connectorType?: string };
  SessionSummary: { sessionId: string };
};

export type ManagerStackParamList = {
  ManagerDashboard: undefined;
  StationList: undefined;
  StationForm: { stationId?: string } | undefined;
  PricingControls: { stationId: string };
  LiveSessions: undefined;
  ManagerAnalytics: undefined;
};

export type AdminStackParamList = {
  AdminOverview: undefined;
  ZoneDetail: { zoneId: string };
  NetworkAnalytics: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Driver: NavigatorScreenParams<DriverStackParamList>;
  Manager: NavigatorScreenParams<ManagerStackParamList>;
  Admin: NavigatorScreenParams<AdminStackParamList>;
};
