/**
 * Charger Types and Connector Constants
 */

import { ChargerStatus, ChargerType, ConnectorType } from '@/types/database.types';

// Charger type definitions with metadata
export const CHARGER_TYPES: Record<ChargerType, {
  name: string;
  label: string;
  description: string;
  power: string;
  icon: string;
  color: string;
}> = {
  'level_1': {
    name: 'Level 1',
    label: 'Level 1 Charging',
    description: 'Standard 120V outlet, slowest charging',
    power: '1-2 kW',
    icon: 'battery-charging',
    color: '#78909C',
  },
  'level_2': {
    name: 'Level 2',
    label: 'Level 2 Charging',
    description: 'Standard charging for home or overnight',
    power: '3-22 kW',
    icon: 'battery-charging',
    color: '#4CAF50',
  },
  'dc_fast': {
    name: 'DC Fast',
    label: 'DC Fast Charging',
    description: 'Quick charging for shorter stops',
    power: '25-150 kW',
    icon: 'flash',
    color: '#FF9800',
  },
  'tesla_supercharger': {
    name: 'Supercharger',
    label: 'Tesla Supercharger',
    description: 'Ultra-fast Tesla network charging',
    power: '150-350 kW',
    icon: 'flash-outline',
    color: '#E31937',
  },
};

// Connector type definitions with metadata
export const CONNECTOR_TYPES: Record<ConnectorType, {
  name: string;
  label: string;
  description: string;
  compatible: string[];
}> = {
  'j1772': {
    name: 'J1772',
    label: 'J1772 (Type 1)',
    description: 'Standard AC connector in North America',
    compatible: ['All non-Tesla EVs in NA'],
  },
  'type2': {
    name: 'Type 2',
    label: 'Type 2 (Mennekes)',
    description: 'Standard AC connector in Europe',
    compatible: ['Tesla', 'BMW', 'Audi', 'Mercedes', 'Renault'],
  },
  'ccs': {
    name: 'CCS',
    label: 'CCS (Combined Charging System)',
    description: 'Common DC fast connector in Europe and NA',
    compatible: ['BMW', 'Ford', 'GM', 'Hyundai', 'Volkswagen', 'Mercedes'],
  },
  'chademo': {
    name: 'CHAdeMO',
    label: 'CHAdeMO',
    description: 'Common in Japanese vehicles',
    compatible: ['Nissan', 'Mitsubishi', 'Kia'],
  },
  'tesla': {
    name: 'Tesla',
    label: 'Tesla Connector',
    description: 'Proprietary Tesla connector',
    compatible: ['Tesla Model S', 'Tesla Model 3', 'Tesla Model X', 'Tesla Model Y'],
  },
  'nacs': {
    name: 'NACS',
    label: 'NACS (North American Charging Standard)',
    description: 'New standard adopted by multiple manufacturers',
    compatible: ['Tesla', 'Ford', 'GM', 'Rivian', 'Mercedes'],
  },
};

// Status configuration with colors and labels
export const CHARGER_STATUS_CONFIG: Record<ChargerStatus, {
  label: string;
  color: string;
  backgroundColor: string;
  description: string;
}> = {
  'available': {
    label: 'Available',
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
    description: 'Ready to use',
  },
  'in_use': {
    label: 'In Use',
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
    description: 'Currently charging a vehicle',
  },
  'reserved': {
    label: 'Reserved',
    color: '#2196F3',
    backgroundColor: '#E3F2FD',
    description: 'Reserved by another user',
  },
  'offline': {
    label: 'Offline',
    color: '#9E9E9E',
    backgroundColor: '#F5F5F5',
    description: 'Currently unavailable',
  },
};

// Filter options for UI
export const CHARGER_TYPE_OPTIONS = Object.entries(CHARGER_TYPES).map(([value, data]) => ({
  value: value as ChargerType,
  label: data.label,
}));

export const CONNECTOR_TYPE_OPTIONS = Object.entries(CONNECTOR_TYPES).map(([value, data]) => ({
  value: value as ConnectorType,
  label: data.label,
}));

export const CHARGER_STATUS_OPTIONS = Object.entries(CHARGER_STATUS_CONFIG).map(([value, data]) => ({
  value: value as ChargerStatus,
  label: data.label,
}));
