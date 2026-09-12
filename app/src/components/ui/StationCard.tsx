import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Image,
  ImageSourcePropType,
  TouchableOpacity,
} from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme/tokens';
import { Text } from '../primitives/Text';
import { PillTag } from '../primitives/PillTag';
import { LocationLine } from '../primitives/LocationLine';
import { RatingRow } from '../primitives/RatingRow';
import { ConnectorChip } from '../primitives/ConnectorChip';
import { Button } from '../primitives/Button';
import { ScalePressable } from '../primitives/Pressable';

import { getStationImageSource } from '../../constants/stationImages';

export interface ConnectorInfo {
  type: string;   // e.g. 'CCS2', 'Type-2', 'CHAdeMO'
  icon: string;   // emoji or identifier
}

export interface StationCardProps {
  id: string;
  name: string;
  address: string;
  rating?: number;
  reviewCount?: number;
  distance?: string;   // e.g. "1.2 km"
  eta?: string;        // e.g. "4 min"
  available?: boolean;
  availableLabel?: string;  // e.g. "3 Available"
  thumbnailSource?: ImageSourcePropType;
  connectors?: ConnectorInfo[];
  chargerCount?: number;
  onPress?: () => void;
  onBook?: () => void;
  onBookmark?: () => void;
  style?: ViewStyle;
}

/**
 * StationCard — reference-matched full card layout.
 * thumb (72x72 rounded-12) top-left, bookmark icon top-right of thumb,
 * title, LocationLine, RatingRow, distance+time row, PillTag, 
 * connector chip row + "N charger ›" brand link, PrimaryButton "Book Slot".
 */
export const StationCard: React.FC<StationCardProps> = ({
  id,
  name,
  address,
  rating,
  reviewCount,
  distance,
  eta,
  available = true,
  availableLabel,
  thumbnailSource,
  connectors = [],
  chargerCount,
  onPress,
  onBook,
  onBookmark,
  style,
}) => {
  const resolvedThumb = thumbnailSource ?? getStationImageSource(id || name);

  return (
    <ScalePressable
      onPress={onPress}
      style={[styles.card, style ?? {}] as any}
    >
      {/* Top row: thumb + info */}
      <View style={styles.topRow}>
        {/* Thumbnail with bookmark overlay */}
        <View style={styles.thumbWrapper}>
          <Image
            source={resolvedThumb}
            style={styles.thumb}
            resizeMode="cover"
          />
          {/* Bookmark icon */}
          {onBookmark != null && (
            <TouchableOpacity
              onPress={onBookmark}
              activeOpacity={0.7}
              style={styles.bookmarkBtn}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text style={styles.bookmarkIcon}>🔖</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Station info */}
        <View style={styles.infoBlock}>
          <Text variant="cardTitle" numberOfLines={2} style={styles.name}>
            {name}
          </Text>
          <LocationLine address={address} numberOfLines={1} />
          {(rating != null) && (
            <RatingRow rating={rating} reviewCount={reviewCount} />
          )}
        </View>
      </View>

      {/* Distance + time row + availability pill */}
      <View style={styles.metaRow}>
        {(distance != null || eta != null) && (
          <Text variant="caption" color={colors.ink2}>
            {[distance, eta].filter(Boolean).join(' · ')}
          </Text>
        )}
        <View style={styles.metaRight}>
          <PillTag
            label={availableLabel ?? (available ? 'Available' : 'Full')}
            color={available ? colors.brand : colors.danger}
            tintColor={available ? colors.brandTint : '#FDECEC'}
          />
        </View>
      </View>

      {/* Connector chips row */}
      {connectors.length > 0 && (
        <View style={styles.connectorRow}>
          {connectors.slice(0, 4).map((c, i) => (
            <ConnectorChip key={`${c.type}-${i}`} icon={c.icon} size={36} />
          ))}
          {chargerCount != null && (
            <Text variant="caption" color={colors.brand} style={styles.chargerLink}>
              {chargerCount} charger ›
            </Text>
          )}
        </View>
      )}

      {/* Book button */}
      {onBook != null && (
        <Button
          label="Book Slot"
          variant="primary"
          onPress={onBook}
          style={styles.bookBtn}
        />
      )}
    </ScalePressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.sm,
    ...shadows.card,
  } as ViewStyle,
  topRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  thumbWrapper: {
    position: 'relative',
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radii.thumbnail,
  },
  thumbPlaceholder: {
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 28,
  },
  bookmarkBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  bookmarkIcon: {
    fontSize: 14,
  },
  infoBlock: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontFamily: 'Manrope_700Bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRight: {
    marginLeft: 'auto',
  },
  connectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chargerLink: {
    fontFamily: 'Manrope_700Bold',
    marginLeft: spacing.xs,
  },
  bookBtn: {
    marginTop: spacing.xs,
  },
});
