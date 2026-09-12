/**
 * Station Filters Modal
 * Allows filtering stations by charger type, connector type, amenities, etc.
 */

import { Button } from '@/components/ui';
import { CHARGER_TYPES, CONNECTOR_TYPES } from '@/constants/chargerTypes';
import { colors } from '@/constants/colors';
import { DEFAULT_FILTERS, FilterState, useFilters } from '@/hooks/useFilters';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { spacing } from '@/styles/spacing';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Amenities options
const AMENITIES = [
  { id: 'restrooms', label: 'Restrooms', icon: 'water-outline' },
  { id: 'wifi', label: 'WiFi', icon: 'wifi-outline' },
  { id: 'cafe', label: 'Cafe', icon: 'cafe-outline' },
  { id: 'shopping', label: 'Shopping', icon: 'bag-outline' },
  { id: 'parking', label: 'Free Parking', icon: 'car-outline' },
  { id: '24h', label: '24/7 Access', icon: 'time-outline' },
];

// Distance options in km
const DISTANCE_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 15, label: '15 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100+ km' },
];

// Price range options (per kWh) - INR
const PRICE_RANGES = [
  { min: 0, max: 10, label: 'Under ₹10' },
  { min: 10, max: 15, label: '₹10 - ₹15' },
  { min: 15, max: 20, label: '₹15 - ₹20' },
  { min: 20, max: Infinity, label: 'Over ₹20' },
];


export default function FiltersModal() {
  const { filters: globalFilters, setFilters: setGlobalFilters } = useFilters();
  const { colors: themeColors, isDark } = useTheme();
  const { t } = useLanguage();

  // Initialize local state from global context
  const [filters, setFilters] = useState<FilterState>(globalFilters);

  // Sync when global filters change (e.g. from clear button on explore screen)
  React.useEffect(() => {
    setFilters(globalFilters);
  }, [globalFilters]);

  const handleChargerTypeToggle = useCallback((type: string) => {
    setFilters(prev => ({
      ...prev,
      chargerTypes: prev.chargerTypes.includes(type)
        ? prev.chargerTypes.filter(t => t !== type)
        : [...prev.chargerTypes, type],
    }));
  }, []);

  const handleConnectorTypeToggle = useCallback((type: string) => {
    setFilters(prev => ({
      ...prev,
      connectorTypes: prev.connectorTypes.includes(type)
        ? prev.connectorTypes.filter(t => t !== type)
        : [...prev.connectorTypes, type],
    }));
  }, []);

  const handleAmenityToggle = useCallback((amenity: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  }, []);

  const handleDistanceChange = useCallback((distance: number) => {
    setFilters(prev => ({
      ...prev,
      maxDistance: prev.maxDistance === distance ? null : distance,
    }));
  }, []);

  const handlePriceRangeChange = useCallback((range: { min: number; max: number } | null) => {
    setFilters(prev => ({
      ...prev,
      priceRange: prev.priceRange?.min === range?.min ? null : range,
    }));
  }, []);

  const handleAvailableOnlyToggle = useCallback(() => {
    setFilters(prev => ({ ...prev, availableOnly: !prev.availableOnly }));
  }, []);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleApply = useCallback(() => {
    // Save filters to global context so consuming screens re-render immediately
    setGlobalFilters(filters);
    router.back();
  }, [filters, setGlobalFilters]);

  const activeFiltersCount = 
    filters.chargerTypes.length +
    filters.connectorTypes.length +
    filters.amenities.length +
    (filters.priceRange ? 1 : 0) +
    (filters.availableOnly ? 1 : 0) +
    (filters.maxDistance != null && filters.maxDistance < 100 ? 1 : 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('filter.title', 'Filters')}</Text>
        <TouchableOpacity onPress={handleReset} disabled={activeFiltersCount === 0}>
          <Text style={[
            styles.resetText,
            activeFiltersCount === 0 && styles.resetTextDisabled,
            activeFiltersCount > 0 && { color: themeColors.primary }
          ]}>
            {t('filter.reset', 'Reset')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Available Only Toggle */}
        <View style={styles.section}>
          <View style={[styles.switchRow, { backgroundColor: themeColors.surface }]}>
            <View>
              <Text style={[styles.switchLabel, { color: themeColors.textPrimary }]}>{t('filter.available_only', 'Available Chargers Only')}</Text>
              <Text style={[styles.switchDescription, { color: themeColors.textSecondary }]}>
                {t('filter.available_desc', 'Show only stations with available chargers')}
              </Text>
            </View>
            <Switch
              value={filters.availableOnly}
              onValueChange={handleAvailableOnlyToggle}
              trackColor={{ false: isDark ? '#374151' : colors.neutral[200], true: themeColors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Distance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>{t('filter.max_distance', 'Maximum Distance')}</Text>
          <View style={styles.chipContainer}>
            {DISTANCE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.chip,
                  { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                  filters.maxDistance === option.value && { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
                ]}
                onPress={() => handleDistanceChange(option.value)}
              >
                <Text style={[
                  styles.chipText,
                  { color: themeColors.textPrimary },
                  filters.maxDistance === option.value && { color: colors.white },
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Charger Type */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>{t('filter.charger_type', 'Charger Type')}</Text>
          <View style={styles.optionList}>
            {Object.entries(CHARGER_TYPES).map(([key, type]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.optionRow,
                  { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                  filters.chargerTypes.includes(key) && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : colors.primary[50], borderColor: themeColors.primary },
                ]}
                onPress={() => handleChargerTypeToggle(key)}
              >
                <View style={[styles.optionIcon, { backgroundColor: type.color + '20' }]}>
                  <Ionicons name="flash" size={18} color={type.color} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionLabel, { color: themeColors.textPrimary }]}>{type.name}</Text>
                  <Text style={[styles.optionDescription, { color: themeColors.textSecondary }]}>{type.power}</Text>
                </View>
                {filters.chargerTypes.includes(key) && (
                  <Ionicons name="checkmark-circle" size={24} color={themeColors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Connector Type */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>{t('filter.connector_type', 'Connector Type')}</Text>
          <View style={styles.chipContainer}>
            {Object.entries(CONNECTOR_TYPES).map(([key, type]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.chip,
                  { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                  filters.connectorTypes.includes(key) && { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
                ]}
                onPress={() => handleConnectorTypeToggle(key)}
              >
                <Text style={[
                  styles.chipText,
                  { color: themeColors.textPrimary },
                  filters.connectorTypes.includes(key) && { color: colors.white },
                ]}>
                  {type.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price Range */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>{t('filter.price_per_kwh', 'Price per kWh')}</Text>
          <View style={styles.chipContainer}>
            {PRICE_RANGES.map((range, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.chip,
                  { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                  filters.priceRange?.min === range.min && { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
                ]}
                onPress={() => handlePriceRangeChange(range)}
              >
                <Text style={[
                  styles.chipText,
                  { color: themeColors.textPrimary },
                  filters.priceRange?.min === range.min && { color: colors.white },
                ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Amenities */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>{t('filter.amenities', 'Amenities')}</Text>
          <View style={styles.amenitiesGrid}>
            {AMENITIES.map((amenity) => (
              <TouchableOpacity
                key={amenity.id}
                style={[
                  styles.amenityItem,
                  { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                  filters.amenities.includes(amenity.id) && { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
                ]}
                onPress={() => handleAmenityToggle(amenity.id)}
              >
                <Ionicons
                  name={amenity.icon as any}
                  size={20}
                  color={
                    filters.amenities.includes(amenity.id)
                      ? colors.white
                      : themeColors.textSecondary
                  }
                />
                <Text style={[
                  styles.amenityText,
                  { color: themeColors.textPrimary },
                  filters.amenities.includes(amenity.id) && { color: colors.white },
                ]}>
                  {t(`station.amenity.${amenity.id}`, amenity.label)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Apply Button */}
      <View style={[styles.footer, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
        <Button
          title={`${t('filter.apply', 'Apply Filters')}${activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}`}
          onPress={handleApply}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  resetText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary[500],
  },
  resetTextDisabled: {
    color: colors.neutral[300],
  },
  content: {
    flex: 1,
    padding: spacing.screenPadding,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: spacing.radius.lg,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral[800],
  },
  switchDescription: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  chipSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[700],
  },
  chipTextSelected: {
    color: colors.primary[700],
  },
  optionList: {
    gap: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.neutral[50],
    borderRadius: spacing.radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  optionRowSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral[800],
  },
  optionDescription: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.neutral[50],
    borderRadius: spacing.radius.full,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  amenityItemSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  amenityText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[700],
  },
  amenityTextSelected: {
    color: colors.primary[700],
  },
  footer: {
    padding: spacing.screenPadding,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
});
