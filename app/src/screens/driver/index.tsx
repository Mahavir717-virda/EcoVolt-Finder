import React from 'react';
import { PlaceholderScreen } from '../placeholder/PlaceholderScreen';

// Core Driver Screens
export { HomeMapScreen } from './HomeMapScreen';
export { StationDetailScreen } from './StationDetailScreen';
export { RouteCompareScreen } from './RouteCompareScreen';
export { SmartChargeScreen } from './SmartChargeScreen';
export { ConfirmBookingScreen, ConfirmBookingScreen as BookingConfirmScreen } from './ConfirmBookingScreen';
export { ProfileScreen } from './ProfileScreen';
export { VehiclesScreen } from './VehiclesScreen';

// Placeholders for M1-C9 & M1-C10
export const ActiveSessionScreen: React.FC = () => (
  <PlaceholderScreen
    title="Live Charging Session"
    subtitle="Volt pulse, kWh progress, live cost & CO₂ saved"
    roleContext="driver"
  />
);

export const SessionSummaryScreen: React.FC = () => (
  <PlaceholderScreen
    title="Session Complete"
    subtitle="Delivered kWh, ₹ paid, avg renewable % and CO₂ avoided"
    roleContext="driver"
  />
);
