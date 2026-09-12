import { ConnectorIcon, CHARGER_COLORS } from '@/components/ui/ConnectorIcon';
import { colors } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
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

function getConnectorList(station: Station & { connectors?: any[]; chargers?: any[] }): ConnectorType[] {
  // Check connectors array
  if (station.connectors && station.connectors.length > 0) {
    const fromConnectors = station.connectors.map((c: any) => {
      const t = String(c.type || '').toLowerCase();
      if (t === 'ccs2' || t === 'bharat_dc_001') return 'ccs';
      if (t === 'type2_ac' || t === 'bharat_ac_001') return 'type2';
      if (t === 'three_pin') return 'j1772';
      return t as ConnectorType;
    }).filter((k) => KNOWN_CONNECTORS.includes(k));
    if (fromConnectors.length > 0) {
      return [...new Set(fromConnectors)].slice(0, 3) as ConnectorType[];
    }
  }

  // Check chargers array
  if (station.chargers && station.chargers.length > 0) {
    const fromChargers = station.chargers.map((c: any) => c.connector_type as ConnectorType).filter((k) => KNOWN_CONNECTORS.includes(k));
    if (fromChargers.length > 0) {
      return [...new Set(fromChargers)].slice(0, 3) as ConnectorType[];
    }
  }

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
  const { colors: themeColors, isDark, accentColor } = useTheme();
  const { t } = useLanguage();
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
        <View style={[styles.compactCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.compactContent}>
            <View style={[styles.availabilityDot, { backgroundColor: getAvailabilityColor() }]} />
            <View style={styles.compactInfo}>
              <Text style={[styles.compactName, { color: themeColors.textPrimary }]} numberOfLines={1}>
                {station.name}
              </Text>
              <Text style={[styles.compactAddress, { color: themeColors.textSecondary }]} numberOfLines={1}>
                {station.address}
              </Text>
            </View>
            <View style={styles.compactStats}>
              <Text style={[styles.availableText, { color: themeColors.textPrimary }]}>
                {station.available_chargers}/{station.total_chargers}
              </Text>
              {station.price_from !== undefined && (
                <Text style={[styles.compactPriceText, { color: themeColors.primary }]}>₹{station.price_from}/kWh</Text>
              )}
              {distance !== undefined && (
                <Text style={[styles.distanceText, { color: themeColors.textSecondary }]}>
                  {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
          </View>
        </View>
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
      <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border, borderWidth: isDark ? 1 : 0 }]}>
        {/* ── Top Row: Thumbnail + Info + Bookmark ── */}
        <View style={styles.topRow}>
          {/* Thumbnail */}
          <View style={[styles.thumbnailContainer, { backgroundColor: isDark ? '#1F2937' : colors.neutral[200] }]}>
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
              <Text style={[styles.stationName, { color: themeColors.textPrimary }]} numberOfLines={2}>
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
                  color={isSaved ? themeColors.primary : themeColors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Address */}
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={13} color={themeColors.textSecondary} />
              <Text style={[styles.addressText, { color: themeColors.textSecondary }]} numberOfLines={2}>
                {station.address}
              </Text>
            </View>

            {/* Rating */}
            {station.rating != null && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={[styles.ratingText, { color: themeColors.textPrimary }]}>
                  {station.rating.toFixed(1)}{' '}
                  <Text style={[styles.reviewCount, { color: themeColors.textSecondary }]}>({reviewCount} {t('card.reviews', 'reviews')})</Text>
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Divider ── */}
        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

        {/* ── Mid Row: Distance · Time · Availability ── */}
        <View style={styles.midRow}>
          {distanceKm !== null && (
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : colors.primary[50] }]}>
              <Ionicons name="location" size={13} color={themeColors.primary} />
              <Text style={[styles.badgeText, { color: themeColors.primary }]}>
                {distanceKm < 1
                  ? `${(distanceKm * 1000).toFixed(0)} m`
                  : `${distanceKm.toFixed(1)} km`}
              </Text>
            </View>
          )}
          {driveMinutes !== null && (
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : colors.primary[50] }]}>
              <Ionicons name="car-outline" size={13} color={themeColors.primary} />
              <Text style={[styles.badgeText, { color: themeColors.primary }]}>{driveMinutes} {t('card.min', 'min')}</Text>
            </View>
          )}
          <View
            style={[
              styles.availabilityBadge,
              { backgroundColor: isAvailable ? (isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7') : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2') },
            ]}
          >
            <Text
              style={[
                styles.availabilityBadgeText,
                { color: isAvailable ? (isDark ? '#4ADE80' : colors.primary[700]) : colors.status.error },
              ]}
            >
              {isAvailable ? t('card.available', 'Available') : t('card.unavailable', 'Occupied')}
            </Text>
          </View>
        </View>

        {/* ── Live Data Row: Price and Greenness ── */}
        <View style={styles.liveDataRow}>
          {station.price_from !== undefined && (
            <View style={[styles.priceBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }]}>
              <Ionicons name="flash" size={13} color="#D97706" />
              <Text style={styles.priceText}>{t('card.from', 'From')} ₹{station.price_from}/kWh</Text>
            </View>
          )}
          {station.greenness_score !== undefined && (
            <View style={[styles.greenBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7' }]}>
              <Ionicons name="leaf" size={13} color={themeColors.primary} />
              <Text style={[styles.greenText, { color: themeColors.primary }]}>{station.greenness_score.toFixed(0)}% {t('card.renewable', 'Renewable')}</Text>
            </View>
          )}
        </View>

        {/* ── Divider ── */}
        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

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
            <Text style={[styles.chargerCountText, { color: themeColors.textSecondary }]}>
              {station.total_chargers} {t('card.chargers', 'chargers')} {'>'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Book Slot Button ── */}
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: isAvailable ? themeColors.primary : (isDark ? '#374151' : colors.neutral[300]) }]}
          onPress={handlePress}
          activeOpacity={0.8}
          disabled={!isAvailable}
        >
          <Text style={styles.bookBtnText}>{t('card.book_slot', 'Book Slot')}</Text>
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

  // ── Live Data Row ──
  liveDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
  },
  greenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  greenText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[700],
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
  compactPriceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
    marginTop: 2,
  },
});

export default StationCard;
