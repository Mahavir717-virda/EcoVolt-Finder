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

export const ProfileScreen: React.FC = () => (
  <PlaceholderScreen
    title="Driver Profile & Vehicles"
    subtitle="My EV garage, lifetime ₹ savings & CO₂ avoided"
    roleContext="driver"
  />
);

export const StationDetailScreen: React.FC = () => (
  <PlaceholderScreen
    title="Station Detail"
    subtitle="GreennessGauge, ForecastStrip, PriceBreakdown, TrueCostCard"
    roleContext="driver"
  />
);

export const RouteCompareScreen: React.FC = () => (
  <PlaceholderScreen
    title="Route & True Cost Compare"
    subtitle="Travel cost vs sticker price ranking"
    roleContext="driver"
  />
);

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
