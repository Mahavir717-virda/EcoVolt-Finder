import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { StationWithMeta } from './types';
import { formatConnectorName, formatProviderName } from './utils';
import {
  colors,
  greennessColor,
  greennessBandLabel,
  radii,
  shadows,
  spacing,
} from '../../theme/tokens';
import { Text, Chip, Button } from '../../components';
import { getStationImageSource } from '../../constants/stationImages';

interface StationCardProps {
  station: StationWithMeta;
  isSelected?: boolean;
  onPress?: () => void;
  onViewDetails?: () => void;
  onCompareRoute?: () => void;
  style?: ViewStyle;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  isSelected = false,
  onPress,
  onViewDetails,
  onCompareRoute,
  style,
}) => {
  const isReachable = station.reachable;
  const renewablePct = station.greenness.renewablePct;
  const renewableColor = greennessColor(renewablePct);
  const bandLabel = greennessBandLabel(renewablePct);

  // Available connectors count summary
  const availableConnectors = station.connectors.reduce(
    (acc, c) => acc + c.available,
    0
  );
  const totalConnectors = station.connectors.reduce(
    (acc, c) => acc + c.total,
    0
  );

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[
        styles.cardContainer,
        isSelected && styles.cardSelected,
        !isReachable && styles.cardUnreachable,
        style,
      ]}
    >
      {/* Top Meta Header */}
      <View style={styles.topRow}>
        <Image
          source={getStationImageSource(station.id || station.name)}
          style={styles.stationThumb}
          contentFit="cover"
          transition={100}
          cachePolicy="memory-disk"
        />
        <View style={styles.headerLeft}>
          <Text
            variant="title"
            numberOfLines={1}
            style={[styles.stationName, !isReachable && styles.unreachableText]}
          >
            {station.name}
          </Text>
          <Text variant="micro" color={colors.ink2}>
            {formatProviderName(station.provider)} · {station.operatorName}
          </Text>
        </View>

        {/* Greenness Chip */}
        <Chip
          label={`${renewablePct}% ${station.greenness.band}`}
          variant="subtle"
          dotColor={renewableColor}
          color={renewableColor}
          backgroundColor={`${renewableColor}18`}
        />
      </View>

      {/* Metrics Row: Distance, Price, True Cost */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text variant="micro" color={colors.ink3}>
            Distance
          </Text>
          <Text variant="bodyMedium" style={styles.metricValue}>
            {station.distanceKm} km{' '}
            <Text variant="micro" color={colors.ink3}>
              ({station.travelMinutes}m)
            </Text>
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricItem}>
          <Text variant="micro" color={colors.ink3}>
            Price from
          </Text>
          <Text variant="bodyMedium" style={styles.metricValue}>
            ₹{(station.priceFrom ?? 6.0).toFixed(1)}{' '}
            <Text variant="micro" color={colors.ink3}>
              /kWh
            </Text>
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricItem}>
          <Text variant="micro" color={colors.ink3}>
            True Total
          </Text>
          <Text
            variant="bodyMedium"
            color={colors.brand}
            style={styles.metricValueBold}
          >
            ₹{Math.round(station.trueTotalCost ?? 120)}
          </Text>
        </View>
      </View>

      {/* Connectors & Availability */}
      <View style={styles.connectorsRow}>
        <View style={styles.connectorPills}>
          {station.connectors.map((c, i) => (
            <View key={i} style={styles.connectorTag}>
              <Text variant="micro" color={colors.ink2}>
                {formatConnectorName(c.type)} ({c.powerKw}kW)
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.availabilityTag}>
          <View
            style={[
              styles.availDot,
              {
                backgroundColor:
                  availableConnectors > 0 ? colors.brand : colors.warning,
              },
            ]}
          />
          <Text variant="micro" color={colors.ink2}>
            {availableConnectors}/{totalConnectors} free
          </Text>
        </View>
      </View>

      {/* Edge Case Warning: Unreachable (#9) */}
      {!isReachable && station.unreachableReason && (
        <View style={styles.warningBanner}>
          <Text variant="micro" color={colors.danger} style={styles.warningText}>
            ⚠️ {station.unreachableReason}
          </Text>
        </View>
      )}

      {/* Action CTA */}
      <View style={styles.actionRow}>
        {onCompareRoute && (
          <Button
            label="Route & Cost"
            variant="secondary"
            onPress={onCompareRoute}
            style={styles.actionBtnSecondary}
          />
        )}
        {onViewDetails && (
          <Button
            label="View Details"
            variant={isReachable ? 'primary' : 'secondary'}
            onPress={onViewDetails}
            style={styles.actionBtnPrimary}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
    ...shadows.e1,
  },
  cardSelected: {
    borderColor: colors.brand,
    borderWidth: 1.5,
    ...shadows.e2,
  },
  cardUnreachable: {
    backgroundColor: '#FAFBF9',
    borderColor: colors.line,
  },
  unreachableText: {
    color: colors.ink2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stationThumb: {
    width: 46,
    height: 46,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSunken,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  stationName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: colors.ink,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  metricItem: {
    flex: 1,
    gap: 2,
  },
  metricValue: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
  },
  metricValueBold: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.line,
    marginHorizontal: spacing.xs,
  },
  connectorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  connectorPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  connectorTag: {
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  availabilityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  warningBanner: {
    backgroundColor: '#FDECE8',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  warningText: {
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  actionBtnSecondary: {
    flex: 1,
    height: 40,
  },
  actionBtnPrimary: {
    flex: 1,
    height: 40,
  },
});
