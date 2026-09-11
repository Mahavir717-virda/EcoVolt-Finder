import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { StationRecommendation } from '@contracts/types';
import {
  colors,
  radii,
  shadows,
  spacing,
} from '../../theme/tokens';
import { Text } from '../primitives/Text';
import { Chip } from '../primitives/Chip';

export interface TrueCostCardProps {
  recommendation: Partial<StationRecommendation>;
  style?: ViewStyle;
}

export const TrueCostCard: React.FC<TrueCostCardProps> = ({
  recommendation,
  style,
}) => {
  const distanceKm = recommendation.distanceKm ?? 2.4;
  const travelMinutes = recommendation.travelMinutes ?? 8;
  const energyNeeded = recommendation.energyNeededKwh ?? 18.0;
  const chargingCost = recommendation.chargingCost ?? 111.6;
  const travelCost = recommendation.travelCost ?? 14.4;
  const trueTotalCost = recommendation.trueTotalCost ?? chargingCost + travelCost;
  const vsSticker = recommendation.vsCheapestSticker ?? -9.0;
  const reason = recommendation.reason ?? 'Ranked by total expenditure: travel consumption + tariff rate.';
  const isReachable = recommendation.reachable !== false;

  const isSaving = vsSticker < 0;

  return (
    <View style={[styles.container, style]}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <Text variant="title" style={styles.sectionTitle}>
            True Total Cost Comparison
          </Text>
          <Text variant="micro" color={colors.ink3}>
            Includes vehicle travel consumption to avoid the distant-station trap
          </Text>
        </View>

        <Chip
          label="HONEST RANK"
          variant="solid"
          color="#FFFFFF"
          backgroundColor={colors.brand}
        />
      </View>

      {/* True Total Calculation Formula */}
      <View style={styles.mathContainer}>
        {/* Charging Cost Block */}
        <View style={styles.costBlock}>
          <Text variant="micro" color={colors.ink3}>
            Charging Cost
          </Text>
          <Text variant="caption" color={colors.ink2}>
            {energyNeeded} kWh needed
          </Text>
          <Text variant="bodyMedium" style={styles.costValue}>
            ₹{chargingCost.toFixed(1)}
          </Text>
        </View>

        <Text variant="title" color={colors.ink3} style={styles.operatorSign}>
          +
        </Text>

        {/* Travel Cost Block */}
        <View style={styles.costBlock}>
          <Text variant="micro" color={colors.ink3}>
            Travel Drive Cost
          </Text>
          <Text variant="caption" color={colors.ink2}>
            {distanceKm} km · {travelMinutes} min
          </Text>
          <Text variant="bodyMedium" style={styles.costValue}>
            ₹{travelCost.toFixed(1)}
          </Text>
        </View>

        <Text variant="title" color={colors.ink3} style={styles.operatorSign}>
          =
        </Text>

        {/* Total True Cost Block */}
        <View style={[styles.costBlock, styles.totalBlock]}>
          <Text variant="micro" color={colors.brand} style={styles.totalLabel}>
            True Total
          </Text>
          <Text variant="caption" color={colors.ink2}>
            All-inclusive
          </Text>
          <Text variant="title" color={colors.brand} style={styles.totalValue}>
            ₹{Math.round(trueTotalCost)}
          </Text>
        </View>
      </View>

      {/* Edge Case #1: The Cheaper-Farther Station Trap Sticker */}
      <View
        style={[
          styles.stickerBanner,
          isSaving ? styles.stickerSaving : styles.stickerTrap,
        ]}
      >
        <Text
          variant="micro"
          color={isSaving ? colors.brand : colors.danger}
          style={styles.stickerText}
        >
          {isSaving
            ? `✨ ₹${Math.abs(vsSticker).toFixed(0)} cheaper overall than nominal "cheapest sticker" station once driving energy is counted.`
            : `⚠️ Higher travel cost makes this ₹${Math.abs(vsSticker).toFixed(0)} more expensive than closer stations.`}
        </Text>
      </View>

      {/* Plain Language Reason */}
      <View style={styles.reasonBox}>
        <Text variant="micro" color={colors.ink2} style={styles.reasonText}>
          💡 {reason}
        </Text>
      </View>

      {/* Reachable Status (Edge Case #9) */}
      {!isReachable && (
        <View style={styles.unreachableNotice}>
          <Text variant="micro" color={colors.danger}>
            ⚠️ This station is outside your active battery range without a mid-route top-up.
          </Text>
        </View>
      )}
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
    ...shadows.e1,
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
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  mathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  costBlock: {
    flex: 1,
    gap: 2,
  },
  costValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
  },
  operatorSign: {
    paddingHorizontal: 4,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  totalBlock: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontFamily: 'Manrope_700Bold',
  },
  totalValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
  },
  stickerBanner: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  stickerSaving: {
    backgroundColor: colors.brandTint,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
  },
  stickerTrap: {
    backgroundColor: '#FDECE8',
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  stickerText: {
    fontFamily: 'Manrope_600SemiBold',
    lineHeight: 16,
  },
  reasonBox: {
    backgroundColor: colors.surfaceSunken,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  reasonText: {
    lineHeight: 16,
  },
  unreachableNotice: {
    backgroundColor: '#FDECE8',
    padding: spacing.sm,
    borderRadius: radii.md,
  },
});
