/**
 * EcoVolt Dynamic Theme & Appearance Context
 * Powers system-wide Light, Dark, and Accent Color preferences with persistence.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'system' | 'light' | 'dark';
export type MapStylePreference = 'eco' | 'minimal' | 'satellite';

const THEME_STORAGE_KEY = 'ecovolt_theme_preferences';

export interface ThemeColors {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSunken: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  statusAvailable: string;
  statusOccupied: string;
  error: string;
  warning: string;
  success: string;
  white: string;
  black: string;
  tabBarBg: string;
  tabBarBorder: string;
}

interface ThemeContextType {
  themeMode: ThemeMode;
  accentColor: string;
  mapStyle: MapStylePreference;
  highContrast: boolean;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setAccentColor: (color: string) => Promise<void>;
  setMapStyle: (style: MapStylePreference) => Promise<void>;
  setHighContrast: (enabled: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceColorScheme = useDeviceColorScheme();

  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [accentColor, setAccentColorState] = useState<string>('#10B981'); // Volt Emerald default
  const [mapStyle, setMapStyleState] = useState<MapStylePreference>('eco');
  const [highContrast, setHighContrastState] = useState<boolean>(false);

  // Load saved theme settings on mount
  useEffect(() => {
    async function loadThemePrefs() {
      try {
        const raw = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.themeMode) setThemeModeState(parsed.themeMode);
          if (parsed.accentColor) setAccentColorState(parsed.accentColor);
          if (parsed.mapStyle) setMapStyleState(parsed.mapStyle);
          if (parsed.highContrast !== undefined) setHighContrastState(parsed.highContrast);
        }
      } catch {}
    }
    loadThemePrefs();
  }, []);

  const savePrefs = async (prefs: {
    themeMode?: ThemeMode;
    accentColor?: string;
    mapStyle?: MapStylePreference;
    highContrast?: boolean;
  }) => {
    try {
      const current = {
        themeMode,
        accentColor,
        mapStyle,
        highContrast,
        ...prefs,
      };
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, JSON.stringify(current));
    } catch {}
  };

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await savePrefs({ themeMode: mode });
  }, [themeMode, accentColor, mapStyle, highContrast]);

  const setAccentColor = useCallback(async (color: string) => {
    setAccentColorState(color);
    await savePrefs({ accentColor: color });
  }, [themeMode, accentColor, mapStyle, highContrast]);

  const setMapStyle = useCallback(async (style: MapStylePreference) => {
    setMapStyleState(style);
    await savePrefs({ mapStyle: style });
  }, [themeMode, accentColor, mapStyle, highContrast]);

  const setHighContrast = useCallback(async (enabled: boolean) => {
    setHighContrastState(enabled);
    await savePrefs({ highContrast: enabled });
  }, [themeMode, accentColor, mapStyle, highContrast]);

  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return deviceColorScheme === 'dark';
  }, [themeMode, deviceColorScheme]);

  const dynamicColors = useMemo<ThemeColors>(() => {
    if (isDark) {
      return {
        isDark: true,
        background: '#0B1310',
        surface: '#121F19',
        surfaceElevated: '#1A2C24',
        surfaceSunken: '#08110D',
        card: '#121F19',
        textPrimary: '#F1F5F9',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        border: '#1F352A',
        borderLight: '#162720',
        primary: accentColor,
        primaryLight: accentColor + '25',
        primaryDark: '#047857',
        statusAvailable: '#10B981',
        statusOccupied: '#F59E0B',
        error: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        white: '#FFFFFF',
        black: '#000000',
        tabBarBg: '#0D1813',
        tabBarBorder: '#1F352A',
      };
    }

    return {
      isDark: false,
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      surfaceSunken: '#F1F5F9',
      card: '#FFFFFF',
      textPrimary: '#0F172A',
      textSecondary: '#64748B',
      textMuted: '#94A3B8',
      border: '#E2E8F0',
      borderLight: '#F1F5F9',
      primary: accentColor,
      primaryLight: accentColor + '20',
      primaryDark: '#047857',
      statusAvailable: '#10B981',
      statusOccupied: '#F59E0B',
      error: '#EF4444',
      warning: '#F59E0B',
      success: '#10B981',
      white: '#FFFFFF',
      black: '#000000',
      tabBarBg: '#FFFFFF',
      tabBarBorder: '#E2E8F0',
    };
  }, [isDark, accentColor]);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        accentColor,
        mapStyle,
        highContrast,
        isDark,
        colors: dynamicColors,
        setThemeMode,
        setAccentColor,
        setMapStyle,
        setHighContrast,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
