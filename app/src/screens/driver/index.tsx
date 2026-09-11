import React from 'react';
import { PlaceholderScreen } from '../placeholder/PlaceholderScreen';

export { HomeMapScreen } from './HomeMapScreen';

export const SmartChargeScreen: React.FC = () => (
  <PlaceholderScreen
    title="Smart Schedule"
    subtitle="Optimal green windows & automated charging schedule"
    roleContext="driver"
  />
);

export const ActiveSessionScreen: React.FC = () => (
  <PlaceholderScreen
    title="Live Charging Session"
    subtitle="Volt pulse, kWh progress, live cost & CO₂ saved"
    roleContext="driver"
  />
);

export { ProfileScreen } from './ProfileScreen';
export { VehiclesScreen } from './VehiclesScreen';

export { StationDetailScreen } from './StationDetailScreen';

export { RouteCompareScreen } from './RouteCompareScreen';

export const BookingConfirmScreen: React.FC = () => (
  <PlaceholderScreen
    title="Confirm Booking"
    subtitle="Price-lock reservation for your EV slot"
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
