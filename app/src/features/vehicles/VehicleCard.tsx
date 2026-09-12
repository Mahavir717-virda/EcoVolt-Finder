import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from '@contracts/types';
import { ConnectorType } from '@contracts/enums';
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

  // Remaining range calculation with clean rounded values
  const remainingKwh = (batteryKwh * currentCharge) / 100;
  const rangeKm = Math.round((remainingKwh * 1000) / efficiency) || 0;
  const fullRangeKm = Math.round((batteryKwh * 1000) / efficiency) || 0;
  
  const modelName =
    vehicle.model ||
    (vehicle as any).name ||
    (vehicle as any).vehicleModel ||
    (isCar ? 'Electric Car' : 'Electric Scooter');

  const vehicleSubtitle =
    (vehicle as any).licensePlate ||
    (vehicle as any).registrationNumber ||
    (isCar ? '4-Wheeler (Car)' : '2-Wheeler (Bike)');

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
      {/* Top Header Row with Icon, Info & Action Buttons */}
      <View style={styles.headerRow}>
        <View style={styles.vehicleHeaderLeft}>
          {/* Branded Vehicle Icon Tile (Reused from Capsule Navbar) */}
          <View
            style={[
              styles.vehicleIconTile,
              isActive && styles.vehicleIconTileActive,
            ]}
          >
            <Ionicons
              name={isCar ? 'car-sport' : 'bicycle'}
              size={24}
              color={isActive ? colors.brand : colors.ink}
            />
          </View>

          {/* Title & Metadata */}
          <View style={styles.vehicleTitleCol}>
            <View style={styles.nameWithBadge}>
              <Text variant="cardTitle" numberOfLines={1} style={styles.vehicleName}>
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
            <Text variant="micro" color={colors.ink2} numberOfLines={1}>
              {vehicleSubtitle} · {batteryKwh} kWh
            </Text>
          </View>
        </View>

        {/* Top-Right Action Controls (Set Active, Edit, Delete) */}
        <View style={styles.actionsRight}>
          {!isActive && (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onSelect}
              style={styles.selectBtn}
              accessibilityLabel="Set vehicle as active"
              accessibilityRole="button"
            >
              <Text variant="micro" color={colors.brand} style={styles.selectBtnText}>
                Set Active
              </Text>
            </TouchableOpacity>
          )}

          {/* Edit Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onEdit}
            style={styles.iconBtnEdit}
            accessibilityLabel="Edit vehicle specifications"
            accessibilityRole="button"
          >
            <Ionicons name="pencil" size={16} color={colors.brand} />
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onDelete}
            style={styles.iconBtnDelete}
            accessibilityLabel="Remove vehicle from garage"
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Battery & Range Status Section (Fully Responsive Single-Line Grid) */}
      <View style={styles.batterySection}>
        <View style={styles.batteryMetaRow}>
          {/* Current Charge */}
          <View style={styles.chargePercentCol}>
            <Text variant="micro" color={colors.ink3} numberOfLines={1}>
              Current Charge
            </Text>
            <Text
              variant="h2"
              color={isBatteryFull ? colors.brand : colors.ink}
              style={styles.chargePercent}
            >
              {Math.round(currentCharge)}%
            </Text>
          </View>

          {/* Vertical Divider */}
          <View style={styles.divider} />

          {/* Estimated Range with Inline Max */}
          <View style={styles.rangeCol}>
            <Text variant="micro" color={colors.ink3} style={styles.rangeLabel} numberOfLines={1}>
              Estimated Range
            </Text>
            <View style={styles.rangeValRow}>
              <Text variant="h2" color={colors.brand} style={styles.rangeVal}>
                {rangeKm}
                <Text style={styles.rangeUnit}> km</Text>
              </Text>
              <Text variant="micro" color={colors.ink3} style={styles.maxRangeText} numberOfLines={1}>
                / {fullRangeKm} max
              </Text>
            </View>
          </View>
        </View>

        {/* Determinate Battery Progress Bar */}
        <LinearProgress
          progress={currentCharge}
          color={isBatteryFull ? colors.brand : colors.brand}
          style={styles.batteryBar}
        />

        {/* Edge Case: Battery Already Full Notice */}
        {isBatteryFull && (
          <View style={styles.fullNotice}>
            <Text variant="micro" color={colors.brand} style={styles.fullNoticeText}>
              ✓ Battery fully charged (100%) · Ready for road
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
          <Text variant="micro" color={colors.ink} style={styles.specValue}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardActive: {
    borderColor: colors.brand,
    borderWidth: 1.5,
    backgroundColor: '#F8FCF9',
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  vehicleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    flex: 1,
  },
  vehicleIconTile: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  vehicleIconTileActive: {
    backgroundColor: colors.brandTint,
    borderColor: colors.brand + '30',
  },
  vehicleTitleCol: {
    flex: 1,
    gap: 2,
  },
  nameWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  vehicleName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15.5,
    color: colors.ink,
    flexShrink: 1,
  },
  activePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectBtn: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: radii.sm,
    backgroundColor: colors.brandTint,
  },
  selectBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11.5,
  },
  iconBtnEdit: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brand + '20',
  },
  iconBtnDelete: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger + '20',
  },
  batterySection: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.card,
    padding: spacing.sm + 4,
    gap: spacing.xs,
  },
  batteryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  chargePercentCol: {
    flex: 1,
    gap: 2,
  },
  chargePercent: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    lineHeight: 24,
    color: colors.ink,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  rangeCol: {
    flex: 1.4,
    gap: 2,
    alignItems: 'flex-end',
  },
  rangeLabel: {
    textAlign: 'right',
  },
  rangeValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    flexWrap: 'nowrap',
  },
  rangeVal: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    lineHeight: 24,
  },
  rangeUnit: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: colors.brand,
  },
  maxRangeText: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: colors.ink3,
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
    fontSize: 11,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingTop: 2,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specValue: {
    fontFamily: 'Manrope_700Bold',
    color: colors.ink,
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
    borderColor: colors.border,
  },
});
