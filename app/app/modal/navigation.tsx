/**
 * Navigation Modal
 * Full-screen in-app navigation with Google Maps directions
 */

import { DirectionsMap } from '@/components/map/DirectionsMap';
import { colors } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NavigationModal() {
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const { t } = useLanguage();
  const { 
    latitude, 
    longitude, 
    name, 
    address 
  } = useLocalSearchParams<{
    latitude: string;
    longitude: string;
    name: string;
    address?: string;
  }>();

  const destination = {
    latitude: parseFloat(latitude || '0'),
    longitude: parseFloat(longitude || '0'),
    name: name || 'Destination',
    address: address,
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('nav.title', 'Navigation')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Directions Map */}
      <DirectionsMap
        destination={destination}
        style={styles.map}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  placeholder: {
    width: 36,
  },
  map: {
    flex: 1,
  },
});
