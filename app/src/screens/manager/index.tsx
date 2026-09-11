import React from 'react';
import { PlaceholderScreen } from '../placeholder/PlaceholderScreen';

export { ManagerDashboardScreen } from './ManagerDashboardScreen';
export { StationFormScreen } from './StationFormScreen';
export { PricingControlsScreen, PricingControlsScreen as PricingControlScreen } from './PricingControlsScreen';

export const ManagerAnalyticsScreen: React.FC = () => (
  <PlaceholderScreen
    title="Manager Station Analytics"
    subtitle="Utilization, demand charge peaks, renewable stats"
    roleContext="manager"
  />
);
