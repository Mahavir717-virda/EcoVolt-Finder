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

export { ActiveSessionScreen } from './ActiveSessionScreen';
export { BookingsScreen, BookingsScreen as BookingsListScreen } from './BookingsScreen';
export { ImpactScreen } from './ImpactScreen';

export const SessionSummaryScreen: React.FC = () => (
  <PlaceholderScreen
    title="Session Complete"
    subtitle="Delivered kWh, ₹ paid, avg renewable % and CO₂ avoided"
    roleContext="driver"
  />
);
