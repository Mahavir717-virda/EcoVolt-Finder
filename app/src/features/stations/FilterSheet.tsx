import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
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

const ALL_CONNECTORS: ConnectorType[] = [
  ConnectorType.CCS2,
  ConnectorType.TYPE2_AC,
  ConnectorType.BHARAT_DC_001,
  ConnectorType.BHARAT_AC_001,
  ConnectorType.CHADEMO,
  ConnectorType.THREE_PIN,
];

const POWER_THRESHOLDS = [
  { label: 'Any', value: null },
  { label: '15 kW+', value: 15 },
  { label: '30 kW+', value: 30 },
  { label: '50 kW+', value: 50 },
  { label: '60 kW+', value: 60 },
];

export const FilterSheet: React.FC<FilterSheetProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
}) => {
  const [draft, setDraft] = useState<StationFilterState>(filters);

  // Sync draft state when sheet opens
  useEffect(() => {
    if (visible) {
      setDraft(filters);
    }
  }, [visible, filters]);

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
    onReset();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
            onChange={(val) => setDraft((prev) => ({ ...prev, vehicleClass: val }))}
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

        {/* 3. Reachable Only Toggle */}
        <View style={styles.switchSection}>
          <View style={styles.switchTextCol}>
            <Text variant="bodyMedium" style={styles.switchTitle}>
              Show Only Reachable Stations
            </Text>
            <Text variant="micro" color={colors.ink3}>
              Excludes stations beyond remaining battery range
            </Text>
          </View>
          <Switch
            value={draft.reachableOnly}
            onValueChange={(val) =>
              setDraft((prev) => ({ ...prev, reachableOnly: val }))
            }
            trackColor={{ false: colors.line, true: colors.brandTint }}
            thumbColor={draft.reachableOnly ? colors.brand : colors.surface}
          />
        </View>

        {/* 4. Minimum Power (kW) */}
        <View style={styles.section}>
          <Text variant="caption" color={colors.ink2} style={styles.sectionLabel}>
            Minimum Charger Power
          </Text>
          <View style={styles.chipsWrap}>
            {POWER_THRESHOLDS.map((pt, i) => {
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
          <Text variant="caption" color={colors.ink2} style={styles.sectionLabel}>
            Connector Compatibility
          </Text>
          <View style={styles.chipsWrap}>
            {ALL_CONNECTORS.map((conn) => {
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  resetText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  scrollContent: {
    gap: spacing.base,
    paddingBottom: spacing.base,
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    fontFamily: 'Manrope_600SemiBold',
  },
  switchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSunken,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  switchTextCol: {
    flex: 1,
    gap: 2,
    marginRight: spacing.sm,
  },
  switchTitle: {
    fontFamily: 'Manrope_600SemiBold',
    color: colors.ink,
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
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  cancelBtn: {
    flex: 1,
  },
  applyBtn: {
    flex: 2,
  },
});
