import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { ConnectorType, VehicleClass } from '@contracts/enums';
import { StationFilterState, StationSortOption } from './types';
import { formatConnectorName } from './utils';
import { colors, radii, spacing } from '../../theme/tokens';
import {
  Text,
  Sheet,
  Button,
  Chip,
  SegmentedControl,
} from '../../components';

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: StationFilterState;
  onApply: (newFilters: StationFilterState) => void;
  onReset: () => void;
}

// 4-Wheeler connectors & defaults
const CAR_CONNECTORS: ConnectorType[] = [
  ConnectorType.CCS2,
  ConnectorType.TYPE2_AC,
  ConnectorType.BHARAT_DC_001,
  ConnectorType.CHADEMO,
  ConnectorType.THREE_PIN,
];

const CAR_DEFAULT_CONNECTORS: ConnectorType[] = [
  ConnectorType.CCS2,
  ConnectorType.TYPE2_AC,
];

const CAR_POWER_THRESHOLDS = [
  { label: 'Any', value: null },
  { label: '15 kW+', value: 15 },
  { label: '30 kW+', value: 30 },
  { label: '50 kW+', value: 50 },
  { label: '60 kW+', value: 60 },
];

// 2-Wheeler connectors & defaults (Standard in India for Ather, Ola, Chetak, TVS iQube)
const BIKE_CONNECTORS: ConnectorType[] = [
  ConnectorType.THREE_PIN,
  ConnectorType.BHARAT_AC_001,
  ConnectorType.TYPE2_AC,
];

const BIKE_DEFAULT_CONNECTORS: ConnectorType[] = [
  ConnectorType.THREE_PIN,
  ConnectorType.BHARAT_AC_001,
  ConnectorType.TYPE2_AC,
];

const BIKE_POWER_THRESHOLDS = [
  { label: 'Any', value: null },
  { label: '3.3 kW+', value: 3.3 },
  { label: '7 kW+', value: 7 },
  { label: '15 kW+', value: 15 },
];

export const FilterSheet: React.FC<FilterSheetProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.min(Math.round(windowHeight * 0.85), 720);
  const [draft, setDraft] = useState<StationFilterState>(filters);

  // Sync draft state when sheet opens
  useEffect(() => {
    if (visible) {
      setDraft(filters);
    }
  }, [visible, filters]);

  // Handle vehicle class toggle with smart resets
  const handleVehicleClassChange = (newClass: VehicleClass) => {
    if (newClass === draft.vehicleClass) return;

    if (newClass === VehicleClass.BIKE) {
      // Switching to 2-Wheeler: reset to bike defaults
      setDraft((prev) => ({
        ...prev,
        vehicleClass: VehicleClass.BIKE,
        minPowerKw: null,
        connectorTypes: [...BIKE_DEFAULT_CONNECTORS],
      }));
    } else {
      // Switching to 4-Wheeler: reset to car defaults
      setDraft((prev) => ({
        ...prev,
        vehicleClass: VehicleClass.CAR,
        minPowerKw: null,
        connectorTypes: [...CAR_DEFAULT_CONNECTORS],
      }));
    }
  };

  const toggleConnector = (connector: ConnectorType) => {
    setDraft((prev) => {
      const exists = prev.connectorTypes.includes(connector);
      const updated = exists
        ? prev.connectorTypes.filter((c) => c !== connector)
        : [...prev.connectorTypes, connector];
      return { ...prev, connectorTypes: updated };
    });
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleReset = () => {
    const isBike = draft.vehicleClass === VehicleClass.BIKE;
    setDraft({
      vehicleClass: draft.vehicleClass,
      sortBy: 'trueCost',
      reachableOnly: false,
      minPowerKw: null,
      connectorTypes: isBike ? [...BIKE_DEFAULT_CONNECTORS] : [...CAR_DEFAULT_CONNECTORS],
      query: draft.query || '',
    });
    onReset();
    onClose();
  };

  const isBike = draft.vehicleClass === VehicleClass.BIKE;
  const currentConnectors = isBike ? BIKE_CONNECTORS : CAR_CONNECTORS;
  const currentPowerThresholds = isBike ? BIKE_POWER_THRESHOLDS : CAR_POWER_THRESHOLDS;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      style={[styles.sheetContainer, { height: sheetHeight }]}
    >
      <View style={styles.headerRow}>
        <Text variant="title" style={styles.sheetTitle}>
          Filter & Sort Stations
        </Text>
        <TouchableOpacity activeOpacity={0.7} onPress={handleReset}>
          <Text variant="caption" color={colors.danger} style={styles.resetText}>
            Reset All
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={true}
      >
        {/* 1. Vehicle Class */}
        <View style={styles.section}>
          <Text variant="caption" color={colors.ink2} style={styles.sectionLabel}>
            Vehicle Profile Class
          </Text>
          <SegmentedControl
            options={[
              { label: '🚗 4-Wheeler (Car)', value: VehicleClass.CAR },
              { label: '🛵 2-Wheeler (Bike)', value: VehicleClass.BIKE },
            ]}
            value={draft.vehicleClass}
            onChange={handleVehicleClassChange}
          />
        </View>

        {/* 2. Sort By */}
        <View style={styles.section}>
          <Text variant="caption" color={colors.ink2} style={styles.sectionLabel}>
            Sort By
          </Text>
          <SegmentedControl<StationSortOption>
            options={[
              { label: '⚡ True Cost', value: 'trueCost' },
              { label: '🌱 Greenest', value: 'greenest' },
              { label: '📍 Nearest', value: 'nearest' },
            ]}
            value={draft.sortBy}
            onChange={(val) => setDraft((prev) => ({ ...prev, sortBy: val }))}
          />
        </View>

        {/* 3. Reachable Only Interactive Toggle Card */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() =>
            setDraft((prev) => ({ ...prev, reachableOnly: !prev.reachableOnly }))
          }
          style={[
            styles.switchSection,
            draft.reachableOnly && styles.switchSectionActive,
          ]}
        >
          <View
            style={[
              styles.switchIconBox,
              draft.reachableOnly && styles.switchIconBoxActive,
            ]}
          >
            <Text style={styles.switchEmoji}>
              {draft.reachableOnly ? '🔋' : '⚡'}
            </Text>
          </View>
          <View style={styles.switchTextCol}>
            <View style={styles.switchTitleRow}>
              <Text
                variant="bodyMedium"
                style={[
                  styles.switchTitle,
                  draft.reachableOnly && styles.switchTitleActive,
                ]}
              >
                Show Only Reachable Stations
              </Text>
              {draft.reachableOnly ? (
                <View style={styles.activeBadge}>
                  <View style={styles.activeBadgeDot} />
                  <Text variant="micro" color={colors.brand} style={styles.activeBadgeText}>
                    ON
                  </Text>
                </View>
              ) : (
                <View style={styles.inactiveBadge}>
                  <Text variant="micro" color={colors.ink3} style={styles.inactiveBadgeText}>
                    OFF
                  </Text>
                </View>
              )}
            </View>
            <Text
              variant="micro"
              color={draft.reachableOnly ? colors.brandPress : colors.ink3}
              style={styles.switchSubtitle}
            >
              {draft.reachableOnly
                ? 'Only stations reachable with remaining battery range'
                : 'Showing all stations regardless of battery range'}
            </Text>
          </View>
          <Switch
            value={draft.reachableOnly}
            onValueChange={(val) =>
              setDraft((prev) => ({ ...prev, reachableOnly: val }))
            }
            trackColor={{ false: '#D1D5DB', true: colors.brand }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#D1D5DB"
          />
        </TouchableOpacity>

        {/* 4. Minimum Power (kW) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="caption" color={colors.ink2} style={styles.sectionLabel}>
              Minimum Charger Power {isBike ? '(AC Slow/Fast)' : '(DC Fast/AC)'}
            </Text>
            {draft.minPowerKw !== null && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setDraft((p) => ({ ...p, minPowerKw: null }))}
              >
                <Text variant="micro" color={colors.brand} style={styles.resetInlineText}>
                  Clear
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.chipsWrap}>
            {currentPowerThresholds.map((pt, i) => {
              const isSelected = draft.minPowerKw === pt.value;
              return (
                <Chip
                  key={i}
                  label={pt.label}
                  variant={isSelected ? 'solid' : 'outline'}
                  color={isSelected ? colors.brand : colors.ink2}
                  backgroundColor={isSelected ? colors.brand : undefined}
                  onPress={() =>
                    setDraft((prev) => ({ ...prev, minPowerKw: pt.value }))
                  }
                />
              );
            })}
          </View>
        </View>

        {/* 5. Connector Type */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="caption" color={colors.ink2} style={styles.sectionLabel}>
              {isBike ? '2-Wheeler Connectors' : '4-Wheeler Connectors'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                setDraft((p) => ({
                  ...p,
                  connectorTypes: isBike ? [...BIKE_DEFAULT_CONNECTORS] : [...CAR_DEFAULT_CONNECTORS],
                }))
              }
            >
              <Text variant="micro" color={colors.ink3} style={styles.resetInlineText}>
                Reset Defaults
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chipsWrap}>
            {currentConnectors.map((conn) => {
              const isSelected = draft.connectorTypes.includes(conn);
              return (
                <Chip
                  key={conn}
                  label={formatConnectorName(conn)}
                  variant={isSelected ? 'solid' : 'outline'}
                  color={isSelected ? colors.brand : colors.ink2}
                  backgroundColor={isSelected ? colors.brand : undefined}
                  onPress={() => toggleConnector(conn)}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer Action Buttons */}
      <View style={styles.footerRow}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={onClose}
          style={styles.cancelBtn}
        />
        <Button
          label="Apply Filters"
          variant="primary"
          onPress={handleApply}
          style={styles.applyBtn}
        />
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  sheetTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  resetText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  section: {
    gap: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontFamily: 'Manrope_600SemiBold',
  },
  resetInlineText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  switchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  switchSectionActive: {
    backgroundColor: colors.brandTint,
    borderColor: colors.brand,
  },
  switchIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchIconBoxActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  switchEmoji: {
    fontSize: 18,
  },
  switchTextCol: {
    flex: 1,
    gap: 2,
  },
  switchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  switchTitle: {
    fontFamily: 'Manrope_600SemiBold',
    color: colors.ink,
    fontSize: 14,
  },
  switchTitleActive: {
    color: colors.brandPress,
    fontFamily: 'Manrope_700Bold',
  },
  switchSubtitle: {
    lineHeight: 16,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  activeBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  activeBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
  },
  inactiveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
  },
  inactiveBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  cancelBtn: {
    flex: 1,
  },
  applyBtn: {
    flex: 2,
  },
});
