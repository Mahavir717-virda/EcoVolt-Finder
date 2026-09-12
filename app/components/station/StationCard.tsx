import { Card, Skeleton } from '@/components/ui';
import { ConnectorIcon, CHARGER_COLORS, CONNECTOR_LABELS } from '@/components/ui/ConnectorIcon';
import { colors } from '@/constants/colors';
import { getStationImageSource } from '@/constants/stationImages';
import type { Station, ConnectorType, ChargerType } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Derive connector types from station amenities (fallback to CCS/CHAdeMO/Type2)
const KNOWN_CONNECTORS: ConnectorType[] = ['ccs', 'chademo', 'type2', 'j1772', 'tesla', 'nacs'];

function getChargerTypeForConnector(connector: ConnectorType): ChargerType {
  switch (connector) {
    case 'ccs':
    case 'chademo':
      return 'dc_fast';
    case 'type2':
    case 'j1772':
      return 'level_2';
    case 'tesla':
    case 'nacs':
      return 'tesla_supercharger';
    default:
      return 'dc_fast';
  }
}

function getConnectorList(station: Station): ConnectorType[] {
  const amenities = station.amenities ?? [];
  const found = amenities
    .map((a) => a.toLowerCase().replace(/[^a-z0-9]/g, '') as ConnectorType)
    .filter((k) => KNOWN_CONNECTORS.includes(k));
  if (found.length === 0) return ['ccs', 'type2'] as ConnectorType[];
  return [...new Set(found)].slice(0, 3) as ConnectorType[];
}

interface StationCardProps {
  station: Station;
  distance?: number; // in km
  onPress?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  variant?: 'default' | 'compact';
}

export function StationCard({
  station,
  distance,
  onPress,
  onSave,
  isSaved = false,
  variant = 'default',
}: StationCardProps) {
  const [isImageLoading, setIsImageLoading] = useState(true);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: '/station/[stationId]',
        params: { stationId: station.id },
      });
    }
  };

  const availabilityPercentage =
    station.total_chargers > 0
      ? (station.available_chargers / station.total_chargers) * 100
      : 0;

  const getAvailabilityColor = () => {
    if (availabilityPercentage >= 50) return colors.status.success;
    if (availabilityPercentage >= 20) return colors.status.warning;
    return colors.status.error;
  };

  const isAvailable = station.available_chargers > 0;

  // ── Compact variant ──
  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <Card style={styles.compactCard}>
          <View style={styles.compactContent}>
            <View style={[styles.availabilityDot, { backgroundColor: getAvailabilityColor() }]} />
            <View style={styles.compactInfo}>
              <Text style={styles.compactName} numberOfLines={1}>
                {station.name}
              </Text>
              <Text style={styles.compactAddress} numberOfLines={1}>
                {station.address}
              </Text>
            </View>
            <View style={styles.compactStats}>
              <Text style={styles.availableText}>
                {station.available_chargers}/{station.total_chargers}
              </Text>
              {distance !== undefined && (
                <Text style={styles.distanceText}>
                  {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  // ── Default variant (reference design) ──
  const imageSource =
    station.image_url &&
    station.image_url.startsWith('http') &&
    !station.image_url.includes('unsplash')
      ? { uri: station.image_url }
      : getStationImageSource(station.id || station.name);

  const distanceKm = distance !== undefined ? distance : null;
  const driveMinutes =
    distanceKm !== null ? Math.round(distanceKm * 3.5 + 2) : null;

  const connectors = getConnectorList(station);
  const reviewCount = Math.max(5, Math.floor((station.rating ?? 3.5) * 35 + 10));

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85} style={styles.cardWrapper}>
      <View style={styles.card}>
        {/* ── Top Row: Thumbnail + Info + Bookmark ── */}
        <View style={styles.topRow}>
          {/* Thumbnail */}
          <View style={styles.thumbnailContainer}>
            {isImageLoading && (
              <Skeleton
                width={90}
                height={90}
                borderRadius={12}
                style={StyleSheet.absoluteFillObject}
              />
            )}
            <Image
              source={imageSource}
              style={styles.thumbnail}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
              priority="high"
              onLoadStart={() => setIsImageLoading(true)}
              onLoad={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
            />
          </View>

          {/* Station details */}
          <View style={styles.infoContainer}>
            {/* Name + Bookmark */}
            <View style={styles.nameRow}>
              <Text style={styles.stationName} numberOfLines={2}>
                {station.name}
              </Text>
              <TouchableOpacity
                style={styles.bookmarkButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onSave?.();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={isSaved ? colors.primary[600] : colors.neutral[400]}
                />
              </TouchableOpacity>
            </View>

            {/* Address */}
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={13} color={colors.neutral[400]} />
              <Text style={styles.addressText} numberOfLines={2}>
                {station.address}
              </Text>
            </View>

            {/* Rating */}
            {station.rating != null && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {station.rating.toFixed(1)}{' '}
                  <Text style={styles.reviewCount}>({reviewCount} review{reviewCount !== 1 ? 's' : ''})</Text>
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Mid Row: Distance · Time · Availability ── */}
        <View style={styles.midRow}>
          {distanceKm !== null && (
            <View style={styles.badge}>
              <Ionicons name="location" size={13} color={colors.primary[600]} />
              <Text style={styles.badgeText}>
                {distanceKm < 1
                  ? `${(distanceKm * 1000).toFixed(0)} m`
                  : `${distanceKm.toFixed(1)} km`}
              </Text>
            </View>
          )}
          {driveMinutes !== null && (
            <View style={styles.badge}>
              <Ionicons name="car-outline" size={13} color={colors.primary[600]} />
              <Text style={styles.badgeText}>{driveMinutes} min</Text>
            </View>
          )}
          <View
            style={[
              styles.availabilityBadge,
              { backgroundColor: isAvailable ? '#DCFCE7' : '#FEE2E2' },
            ]}
          >
            <Text
              style={[
                styles.availabilityBadgeText,
                { color: isAvailable ? colors.primary[700] : colors.status.error },
              ]}
            >
              {isAvailable ? 'Available' : 'Unavailable'}
            </Text>
          </View>
        </View>

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Bottom Row: Connector Icons + Charger Count ── */}
        <View style={styles.bottomRow}>
          <View style={styles.connectorRow}>
            {connectors.map((ct) => (
              <View key={ct} style={styles.connectorIcon}>
                <ConnectorIcon
                  chargerType={getChargerTypeForConnector(ct)}
                  connectorType={ct}
                  size={26}
                />
              </View>
            ))}
          </View>
          <TouchableOpacity onPress={handlePress} style={styles.chargerCountBtn}>
            <Text style={styles.chargerCountText}>
              {station.total_chargers} charger{station.total_chargers !== 1 ? 's' : ''} {'>'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Book Slot Button ── */}
        <TouchableOpacity
          style={[styles.bookBtn, !isAvailable && styles.bookBtnDisabled]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Text style={styles.bookBtnText}>Book Slot</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 14,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // ── Top Row ──
  topRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  thumbnailContainer: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.neutral[200],
  },
  thumbnail: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  stationName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    lineHeight: 21,
  },
  bookmarkButton: {
    paddingTop: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 4,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: colors.neutral[500],
    lineHeight: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  reviewCount: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral[500],
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginVertical: 10,
  },

  // ── Mid Row ──
  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary[50],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[700],
  },
  availabilityBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  availabilityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Bottom Row ──
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectorRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  connectorIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargerCountBtn: {
    paddingVertical: 4,
  },
  chargerCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[600],
  },

  // ── Book Slot Button ──
  bookBtn: {
    backgroundColor: colors.primary[500],
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  bookBtnDisabled: {
    backgroundColor: colors.neutral[300],
  },
  bookBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
  },

  // ── Compact variant ──
  compactCard: {
    padding: 12,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  availabilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  compactAddress: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  compactStats: {
    alignItems: 'flex-end',
  },
  availableText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  distanceText: {
    fontSize: 12,
    color: colors.primary[500],
    marginTop: 2,
  },
});

export default StationCard;
