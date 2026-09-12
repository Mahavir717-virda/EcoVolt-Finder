/**
 * VoltSpot Color Palette
 * Designed for EV charging app - clean, modern, eco-friendly
 */

export const colors = {
  // Primary brand colors
  primary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50', // Main green - eco/charging
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },

  // Secondary accent colors
  accent: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3', // Blue - electric
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },

  // Charger status colors
  status: {
    available: '#4CAF50',    // Green
    inUse: '#FF9800',        // Orange
    reserved: '#2196F3',     // Blue
    offline: '#9E9E9E',      // Gray
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
  },

  // Semantic colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Neutral palette
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // Background colors
  background: {
    light: '#FFFFFF',
    dark: '#121212',
    card: {
      light: '#FFFFFF',
      dark: '#1E1E1E',
    },
    elevated: {
      light: '#F5F5F5',
      dark: '#2D2D2D',
    },
  },

  // Text colors
  text: {
    primary: {
      light: '#212121',
      dark: '#FFFFFF',
    },
    secondary: {
      light: '#757575',
      dark: '#B0B0B0',
    },
    disabled: {
      light: '#BDBDBD',
      dark: '#616161',
    },
  },

  // Common
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export type ColorTheme = typeof colors;
