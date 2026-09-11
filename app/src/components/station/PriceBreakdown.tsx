import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { PriceQuote } from '@contracts/types';
import { formatConnectorName } from '../../features/stations/utils';
import {
  colors,
  radii,
  shadows,
  spacing,
} from '../../theme/tokens';
import { Text } from '../primitives/Text';
import { Chip } from '../primitives/Chip';

export interface PriceBreakdownProps {
  pricing: PriceQuote[];
  style?: ViewStyle;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  pricing,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <Text variant="title" style={styles.sectionTitle}>
            Transparent Tariff Math
          </Text>
          <Text variant="micro" color={colors.ink3}>
            DISCOM base rate + operator margin + green ToU adjustment
          </Text>
        </View>
      </View>

      {/* Pricing Cards per Connector */}
      <View style={styles.quotesList}>
        {pricing.map((quote, index) => {
          const isEstimate = quote.isEstimate;
          const isDiscount = quote.touAdjustment < 0;

          return (
            <View key={index} style={styles.quoteCard}>
              {/* Connector Header */}
              <View style={styles.quoteCardTop}>
                <View style={styles.connectorTitleCol}>
                  <Text variant="bodyMedium" style={styles.connectorTitle}>
                    {formatConnectorName(quote.connectorType)}
                  </Text>
                  <Text variant="micro" color={colors.ink3}>
                    Guaranteed price locked until {new Date(quote.validUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {/* Estimate Tag (Edge Case #14) */}
                {isEstimate && (
                  <Chip
                    label="ESTIMATE"
                    variant="subtle"
                    color={colors.warning}
                    backgroundColor="#FEF6E6"
                  />
                )}
              </View>

              {/* Equation Visual Breakdown */}
              <View style={styles.equationRow}>
                {/* Base Tariff */}
                <View style={styles.eqBlock}>
                  <Text variant="micro" color={colors.ink3}>
                    Base DISCOM
                  </Text>
                  <Text variant="bodyMedium" style={styles.eqValue}>
                    ₹{(quote.baseTariff ?? 5.5).toFixed(2)}
                  </Text>
                </View>

                <Text variant="body" color={colors.ink3} style={styles.eqSign}>
                  +
                </Text>

                {/* Provider Markup */}
                <View style={styles.eqBlock}>
                  <Text variant="micro" color={colors.ink3}>
                    Host Margin
                  </Text>
                  <Text variant="bodyMedium" style={styles.eqValue}>
                    ₹{(quote.providerMarkup ?? 0.5).toFixed(2)}
                  </Text>
                </View>

                <Text variant="body" color={colors.ink3} style={styles.eqSign}>
                  {isDiscount ? '-' : '+'}
                </Text>

                {/* ToU / Green Adjustment */}
                <View style={styles.eqBlock}>
                  <Text variant="micro" color={colors.ink3}>
                    ToU / Green
                  </Text>
                  <Text
                    variant="bodyMedium"
                    color={isDiscount ? colors.brand : colors.ink}
                    style={styles.eqValue}
                  >
                    {isDiscount
                      ? `-₹${Math.abs(quote.touAdjustment ?? 0).toFixed(2)}`
                      : `₹${(quote.touAdjustment ?? 0.2).toFixed(2)}`}
                  </Text>
                </View>

                <Text variant="body" color={colors.ink3} style={styles.eqSign}>
                  =
                </Text>

                {/* Final Price */}
                <View style={[styles.eqBlock, styles.finalBlock]}>
                  <Text variant="micro" color={colors.brand} style={styles.finalLabel}>
                    Final / kWh
                  </Text>
                  <Text variant="title" color={colors.brand} style={styles.finalPrice}>
                    ₹{(quote.finalPrice ?? 6.2).toFixed(2)}
                  </Text>
                </View>
              </View>

              {isEstimate && (
                <View style={styles.estimateDisclaimer}>
                  <Text variant="micro" color={colors.ink3}>
                    ℹ️ Modeled proxy: Time-of-Use slab calculated from live grid renewable abundance.
                  </Text>
                </View>
              )}
            </View>
          );
        })}
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
  quotesList: {
    gap: spacing.sm,
  },
  quoteCard: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.xs,
  },
  quoteCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  connectorTitleCol: {
    flex: 1,
    gap: 2,
  },
  connectorTitle: {
    fontFamily: 'Manrope_700Bold',
  },
  equationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: 2,
  },
  eqBlock: {
    alignItems: 'center',
    gap: 2,
  },
  eqSign: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
  },
  eqValue: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  finalBlock: {
    alignItems: 'flex-end',
  },
  finalLabel: {
    fontFamily: 'Manrope_600SemiBold',
  },
  finalPrice: {
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  estimateDisclaimer: {
    paddingTop: 2,
  },
});
