import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Vehicle } from '@contracts/types';
import { VehicleClass, ConnectorType } from '@contracts/enums';
import { formatConnectorName } from '../stations/utils';
import { colors, radii, shadows, spacing } from '../../theme/tokens';
import { Text, Chip, LinearProgress } from '../../components';

export interface VehicleCardProps {
  vehicle: Vehicle;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  style?: ViewStyle;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  style,
}) => {
  const rawClass = String(vehicle.vehicleClass || (vehicle as any).vehicle_class || 'car').toLowerCase();
  const isCar = rawClass === 'car';
  const batteryKwh =
    Number(vehicle.batteryKwh ?? (vehicle as any).battery_kwh ?? (vehicle as any).batteryCapacityKwh ?? 40.5) || 40.5;
  const efficiency =
    Number(vehicle.efficiencyWhKm ?? (vehicle as any).efficiency_wh_km ?? 140) || 140;
  const currentCharge =
    Number(vehicle.currentChargePct ?? (vehicle as any).current_charge_pct ?? 50) || 0;

  const isBatteryFull = currentCharge >= 100;

  // Remaining range calculation with defensive fallbacks
  const remainingKwh = (batteryKwh * currentCharge) / 100;
  const rangeKm = Math.round(((remainingKwh * 1000) / efficiency) * 10) / 10 || 0;
  const fullRangeKm = Math.round(((batteryKwh * 1000) / efficiency) * 10) / 10 || 0;
  const modelName =
    vehicle.model ||
    (vehicle as any).name ||
    (vehicle as any).vehicleModel ||
    (isCar ? 'Electric Car' : 'Electric Scooter');
  const connectors: (ConnectorType | string)[] = Array.isArray(vehicle.connectors)
    ? vehicle.connectors
    : Array.isArray((vehicle as any).connector_types)
    ? (vehicle as any).connector_types
    : [];

  return (
    <View
      style={[
        styles.cardContainer,
        isActive && styles.cardActive,
        style,
      ]}
    >
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <View style={styles.nameWithBadge}>
            <Text variant="title" style={styles.vehicleName}>
              {modelName}
            </Text>
            {isActive && (
              <Chip
                label="ACTIVE"
                variant="solid"
                color="#FFFFFF"
                backgroundColor={colors.brand}
                style={styles.activePill}
              />
            )}
          </View>
          <Text variant="micro" color={colors.ink2}>
            {isCar ? '🚗 4-Wheeler (Car)' : '🛵 2-Wheeler (Bike)'} · {batteryKwh} kWh Pack
          </Text>
        </View>

        {!isActive && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSelect}
            style={styles.selectBtn}
          >
            <Text variant="micro" color={colors.brand} style={styles.selectBtnText}>
              Set Active
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Battery & Range Status Section */}
      <View style={styles.batterySection}>
        <View style={styles.batteryMetaRow}>
          <View style={styles.chargePercentCol}>
            <Text variant="micro" color={colors.ink3}>
              Current Charge
            </Text>
            <Text
              variant="h2"
              color={isBatteryFull ? colors.brand : colors.ink}
              style={styles.chargePercent}
            >
              {currentCharge}%
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.rangeCol}>
            <Text variant="micro" color={colors.ink3}>
              Estimated Range
            </Text>
            <Text variant="h2" color={colors.brand} style={styles.rangeVal}>
              {rangeKm} km
              <Text variant="micro" color={colors.ink3}>
                {' '}/ {fullRangeKm} max
              </Text>
            </Text>
          </View>
        </View>

        {/* Determinate Battery Progress Bar */}
        <LinearProgress
          progress={currentCharge}
          color={isBatteryFull ? colors.brand : colors.volt}
          style={styles.batteryBar}
        />

        {/* Edge Case #24: Battery Already Full Notice */}
        {isBatteryFull && (
          <View style={styles.fullNotice}>
            <Text variant="micro" color={colors.brand} style={styles.fullNoticeText}>
              ✓ Battery already full (100%) · Ready for long journeys
            </Text>
          </View>
        )}
      </View>

      {/* Efficiency & Connectors Specs */}
      <View style={styles.specsRow}>
        <View style={styles.specItem}>
          <Text variant="micro" color={colors.ink3}>
            Efficiency:
          </Text>
          <Text variant="micro" color={colors.ink}>
            {efficiency} Wh/km
          </Text>
        </View>

        <View style={styles.connectorTags}>
          {connectors.map((c, i) => (
            <View key={i} style={styles.connPill}>
              <Text variant="micro" color={colors.ink2}>
                {formatConnectorName(c)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action Controls */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onEdit}
          style={styles.actionLink}
        >
          <Text variant="micro" color={colors.brand} style={styles.actionText}>
            ✏️ Edit Specs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onDelete}
          style={styles.actionLink}
        >
          <Text variant="micro" color={colors.danger} style={styles.actionText}>
            🗑️ Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
    ...shadows.e1,
  },
  cardActive: {
    borderColor: colors.brand,
    borderWidth: 1.5,
    backgroundColor: '#F8FCF9',
    ...shadows.e2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  nameWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  vehicleName: {
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  activePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  selectBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.brandTint,
  },
  selectBtnText: {
    fontFamily: 'Manrope_700Bold',
  },
  batterySection: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.lg,
    padding: spacing.sm + 2,
    gap: spacing.xs,
  },
  batteryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chargePercentCol: {
    flex: 1,
    gap: 2,
  },
  chargePercent: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.line,
    marginHorizontal: spacing.sm,
  },
  rangeCol: {
    flex: 1.2,
    gap: 2,
    alignItems: 'flex-end',
  },
  rangeVal: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
  },
  batteryBar: {
    marginTop: 4,
    borderRadius: radii.pill,
  },
  fullNotice: {
    backgroundColor: colors.brandTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    marginTop: 2,
  },
  fullNoticeText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  connPill: {
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  actionLink: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  actionText: {
    fontFamily: 'Manrope_600SemiBold',
  },
});
