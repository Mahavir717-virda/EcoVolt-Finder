import React from 'react';
import { PlaceholderScreen } from '../placeholder/PlaceholderScreen';

export const AdminOverviewScreen: React.FC = () => (
  <PlaceholderScreen
    title="Grid Admin Overview"
    subtitle="Network load, regional renewable share, demand response"
    roleContext="admin"
  />
);

export const ZoneDetailScreen: React.FC = () => (
  <PlaceholderScreen
    title="Zone Deep Dive"
    subtitle="Live + forecast greenness & regional generation mix"
    roleContext="admin"
  />
);
