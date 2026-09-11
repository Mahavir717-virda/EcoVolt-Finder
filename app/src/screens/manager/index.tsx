import React from 'react';
import { PlaceholderScreen } from '../placeholder/PlaceholderScreen';

export const ManagerDashboardScreen: React.FC = () => (
  <PlaceholderScreen
    title="Station Manager Dashboard"
    subtitle="Occupancy, revenue, renewable share & demand risk"
    roleContext="manager"
  />
);

export const StationFormScreen: React.FC = () => (
  <PlaceholderScreen
    title="Station Setup"
    subtitle="Connectors, power rating, DISCOM provider mapping"
    roleContext="manager"
  />
);

export const PricingControlScreen: React.FC = () => (
  <PlaceholderScreen
    title="Pricing Engine Controls"
    subtitle="Base tariff + markup + dynamic ToU discount"
    roleContext="manager"
  />
);

export const ManagerAnalyticsScreen: React.FC = () => (
  <PlaceholderScreen
    title="Manager Station Analytics"
    subtitle="Utilization, demand charge peaks, renewable stats"
    roleContext="manager"
  />
);
