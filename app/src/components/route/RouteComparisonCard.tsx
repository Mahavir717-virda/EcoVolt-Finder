import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { StationRecommendation } from '@contracts/types';
import { VehicleClass } from '@contracts/enums';
import {
  colors,
  greennessColor,
  radii,
  shadows,
  spacing,
} from '../../theme/tokens';
import { Text } from '../primitives/Text';
import { Chip } from '../primitives/Chip';
import { Button } from '../primitives/Button';

export interface RouteComparisonCardProps {
  chosen: StationRecommendation;
  recommended: StationRecommendation;
  vehicleClass?: VehicleClass;
  onSelectRecommended: () => void;
  onSelectChosen: () => void;
  onUrgentOverride?: () => void;
  style?: ViewStyle;
}

export const RouteComparisonCard: React.FC<RouteComparisonCardProps> = ({
  chosen,
  recommended,
  vehicleClass = VehicleClass.CAR,
  onSelectRecommended,
  onSelectChosen,
  onUrgentOverride,
  style,
}) => {
  const isSame = chosen.station.id === recommended.station.id;
  const isChosenReachable = chosen.reachable;
  const isRecReachable = recommended.reachable;

  const chosenGreenColor = greennessColor(chosen.station.greenness.renewablePct);
  const recGreenColor = greennessColor(recommended.station.greenness.renewablePct);

  // Efficiency & travel rate based on vehicle class
  const efficiencyLabel =
    vehicleClass === VehicleClass.BIKE
      ? '🛵 2-Wheeler (40 Wh/km · ~₹0.24/km)'
      : '🚗 4-Wheeler (140 Wh/km · ~₹0.84/km)';

  return (
    <View style={[styles.container, style]}>
      {/* Header with Active Vehicle Profile */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleCol}>
          <Text variant="title" style={styles.titleText}>
            True Total Cost Comparison
          </Text>
          <Text variant="micro" color={colors.ink3}>
            {efficiencyLabel}
          </Text>
        </View>

        <Chip
          label="HONEST COMPARISON"
          variant="subtle"
          color={colors.brand}
          backgroundColor={colors.brandTint}
        />
      </View>

      {/* Head-to-Head Comparison Columns */}
      <View style={styles.columnsContainer}>
        {/* 1. Recommended Station (Left Column) */}
        <View style={[styles.columnCard, styles.recommendedCard]}>
          <View style={styles.badgeRow}>
            <Chip
              label="★ RECOMMENDED"
              variant="solid"
              color="#FFFFFF"
              backgroundColor={colors.brand}
              style={styles.pillBadge}
            />
          </View>

          <Text variant="bodyMedium" numberOfLines={1} style={styles.stationName}>
            {recommended.station.name}
          </Text>

          <Text variant="micro" color={colors.ink3}>
            {recommended.distanceKm} km · {recommended.travelMinutes} mins
          </Text>

          {/* Greenness Pill */}
          <Chip
            label={`${recommended.station.greenness.renewablePct}% renewable`}
            variant="subtle"
            dotColor={recGreenColor}
            color={recGreenColor}
            backgroundColor={`${recGreenColor}18`}
            style={styles.metricChip}
          />

          {/* Cost Details */}
          <View style={styles.costDetailsBlock}>
            <View style={styles.costRow}>
              <Text variant="micro" color={colors.ink3}>
                Sticker Rate
              </Text>
              <Text variant="micro" color={colors.ink}>
                ₹{recommended.station.priceFrom.toFixed(1)}/kWh
              </Text>
            </View>

            <View style={styles.costRow}>
              <Text variant="micro" color={colors.ink3}>
                Energy ({recommended.energyNeededKwh} kWh)
              </Text>
              <Text variant="micro" color={colors.ink}>
                ₹{recommended.chargingCost.toFixed(1)}
              </Text>
            </View>

            <View style={styles.costRow}>
              <Text variant="micro" color={colors.ink3}>
                Travel Cost
              </Text>
              <Text variant="micro" color={colors.ink}>
                +₹{recommended.travelCost.toFixed(1)}
              </Text>
            </View>

            <View style={styles.costDivider} />

            <View style={styles.costRow}>
              <Text variant="caption" color={colors.brand} style={styles.totalLabel}>
                True Total
              </Text>
              <Text variant="title" color={colors.brand} style={styles.totalNum}>
                ₹{Math.round(recommended.trueTotalCost)}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Chosen / Selected Station (Right Column) */}
        <View
          style={[
            styles.columnCard,
            styles.chosenCard,
            !isChosenReachable && styles.unreachableCard,
          ]}
        >
          <View style={styles.badgeRow}>
            <Chip
              label={isSame ? 'SAME AS BEST' : 'YOUR SELECTION'}
              variant="subtle"
              color={colors.ink2}
              backgroundColor={colors.surfaceSunken}
              style={styles.pillBadge}
            />
          </View>

          <Text variant="bodyMedium" numberOfLines={1} style={styles.stationName}>
            {chosen.station.name}
          </Text>

          <Text variant="micro" color={colors.ink3}>
            {chosen.distanceKm} km · {chosen.travelMinutes} mins
          </Text>

          {/* Greenness Pill */}
          <Chip
            label={`${chosen.station.greenness.renewablePct}% renewable`}
            variant="subtle"
            dotColor={chosenGreenColor}
            color={chosenGreenColor}
            backgroundColor={`${chosenGreenColor}18`}
            style={styles.metricChip}
          />

          {/* Cost Details */}
          <View style={styles.costDetailsBlock}>
            <View style={styles.costRow}>
              <Text variant="micro" color={colors.ink3}>
                Sticker Rate
              </Text>
              <Text variant="micro" color={colors.ink}>
                ₹{chosen.station.priceFrom.toFixed(1)}/kWh
              </Text>
            </View>

            <View style={styles.costRow}>
              <Text variant="micro" color={colors.ink3}>
                Energy ({chosen.energyNeededKwh} kWh)
              </Text>
              <Text variant="micro" color={colors.ink}>
                ₹{chosen.chargingCost.toFixed(1)}
              </Text>
            </View>

            <View style={styles.costRow}>
              <Text variant="micro" color={colors.ink3}>
                Travel Cost
              </Text>
              <Text variant="micro" color={colors.ink}>
                +₹{chosen.travelCost.toFixed(1)}
              </Text>
            </View>

            <View style={styles.costDivider} />

            <View style={styles.costRow}>
              <Text variant="caption" color={isChosenReachable ? colors.ink : colors.danger} style={styles.totalLabel}>
                True Total
              </Text>
              <Text variant="title" color={isChosenReachable ? colors.ink : colors.danger} style={styles.totalNum}>
                ₹{Math.round(chosen.trueTotalCost)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Explanation Banner / Trap Expose (Edge Case #1) */}
      <View style={styles.reasonBanner}>
        <Text variant="micro" color={colors.ink} style={styles.reasonText}>
          💡 {recommended.reason || chosen.reason}
        </Text>
      </View>

      {/* Unreachable Notice (Edge Case #9) */}
      {!isChosenReachable && (
        <View style={styles.unreachableBanner}>
          <Text variant="micro" color={colors.danger} style={styles.unreachableText}>
            ⚠️ Selected station is beyond your active battery range. We strongly recommend choosing the reachable alternative.
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <View style={styles.mainButtonsRow}>
          {!isSame && (
            <Button
              label="Choose Selected"
              variant="secondary"
              onPress={onSelectChosen}
              style={styles.chosenBtn}
            />
          )}

          <Button
            label={isSame ? 'Proceed to Book Slot' : 'Go with Recommended'}
            variant="primary"
            onPress={onSelectRecommended}
            style={styles.recBtn}
          />
        </View>

        {/* Urgent Override (Edge Case #8) */}
        {onUrgentOverride && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onUrgentOverride}
            style={styles.urgentOverrideBtn}
          >
            <Text variant="micro" color={colors.ink3} align="center">
              ⚡ I need it now — bypass optimal window schedule
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
    ...shadows.e2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitleCol: {
    flex: 1,
    gap: 2,
  },
  titleText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  columnsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  columnCard: {
    flex: 1,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  recommendedCard: {
    borderColor: colors.brand,
    borderWidth: 1.5,
    backgroundColor: '#F4FAF6',
  },
  chosenCard: {
    borderColor: colors.line,
  },
  unreachableCard: {
    backgroundColor: '#FDF4F2',
    borderColor: '#FAC4B8',
  },
  badgeRow: {
    marginBottom: 2,
  },
  pillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stationName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  metricChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginVertical: 2,
  },
  costDetailsBlock: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: 6,
    gap: 3,
    marginTop: 2,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 2,
  },
  totalLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  totalNum: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
  },
  reasonBanner: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
  },
  reasonText: {
    lineHeight: 16,
  },
  unreachableBanner: {
    backgroundColor: '#FDECE8',
    borderRadius: radii.md,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  unreachableText: {
    lineHeight: 15,
  },
  actionsContainer: {
    gap: spacing.xs,
    marginTop: 4,
  },
  mainButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chosenBtn: {
    flex: 1,
    height: 46,
  },
  recBtn: {
    flex: 1.5,
    height: 46,
  },
  urgentOverrideBtn: {
    paddingVertical: 4,
  },
});
