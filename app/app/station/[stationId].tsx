import { Badge, Button, Card, Skeleton } from '@/components/ui';
import { ConnectorIcon } from '@/components/ui/ConnectorIcon';
import { CHARGER_STATUS_CONFIG, CHARGER_TYPES, CONNECTOR_TYPES } from '@/constants/chargerTypes';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useChargers } from '@/hooks/useChargers';
import { useFavoriteStatus } from '@/hooks/useFavorites';
import { usePlacePhotos } from '@/hooks/usePlacePhotos';
import { useStation } from '@/hooks/useStations';
import { useLiveGrid } from '@/hooks/useLiveGrid';
import { useUserLocation } from '@/hooks/useUserLocation';
import { calculateDistance, formatDistance, estimateDrivingTime } from '@/utils/distance';
import { getStationImageSource } from '@/constants/stationImages';
import {
  getLiveGridSnapshot,
  getGridForecast,
  getDynamicPriceQuote,
  getBestChargingWindow,
  greennessColor,
  greennessBandLabel,
} from '@/lib/gridData';
import type { Charger } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';

import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Amenity icons mapping
const AMENITY_ICONS: Record<string, string> = {
  restrooms: 'water-outline',
  wifi: 'wifi-outline',
  cafe: 'cafe-outline',
  shopping: 'bag-outline',
  parking: 'car-outline',
  '24h': 'time-outline',
  food_court: 'fast-food-outline',
};

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || 
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Generate Google Static Map URL with satellite/hybrid view (shows actual buildings)
const getSatelliteMapUrl = (latitude: number, longitude: number, size = '600x400') => {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=18&size=${size}&maptype=hybrid&markers=color:green%7C${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
};

// Open Google Maps to show place with photos
const openGoogleMapsPhotos = (latitude: number, longitude: number, name: string) => {
  const encodedName = encodeURIComponent(name);
  const url = Platform.select({
    ios: `comgooglemaps://?q=${encodedName}&center=${latitude},${longitude}&zoom=18`,
    android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedName})`,
    default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
  });
  
  Linking.canOpenURL(url || '').then((supported) => {
    if (supported) {
      Linking.openURL(url || '');
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    }
  });
};

export default function StationDetailScreen() {
  const { stationId } = useLocalSearchParams<{ stationId: string }>();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { colors: themeColors, isDark } = useTheme();
  const { t } = useLanguage();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isPhotoLoading, setIsPhotoLoading] = useState(true);
  
  // User live location hook
  const { coords: userCoords } = useUserLocation();

  // Fetch station data with user location for dynamic distance calculation
  const { station, loading: stationLoading, error: stationError } = useStation(stationId || '', userCoords);
  
  // Calculate dynamic distance and driving ETA
  const dynamicDistanceKm = useMemo(() => {
    if (userCoords?.latitude && userCoords?.longitude && station?.latitude && station?.longitude) {
      return calculateDistance(
        { latitude: userCoords.latitude, longitude: userCoords.longitude },
        { latitude: station.latitude, longitude: station.longitude }
      );
    }
    return station?.distance ?? null;
  }, [userCoords, station]);

  const dynamicDriveMinutes = useMemo(() => {
    if (dynamicDistanceKm !== null) {
      return estimateDrivingTime(dynamicDistanceKm);
    }
    return null;
  }, [dynamicDistanceKm]);

  // Fetch chargers with real-time updates
  const { chargers, loading: chargersLoading } = useChargers(stationId || '');
  
  // Favorite status
  const { isFavorite, toggle: toggleFavorite, loading: favoriteLoading } = useFavoriteStatus(stationId || '');

  // Fetch Google Places photos
  const { photos, primaryPhoto, loading: photosLoading } = usePlacePhotos(
    station?.latitude,
    station?.longitude,
    station?.name,
    station?.image_url
  );

  // ── Grid & pricing data (dynamic from ML service & backend) ──────────────
  const { liveGrid, forecast, isLive } = useLiveGrid('IN-WE', stationId);
  const bestWindow = useMemo(() => {
    if (forecast && forecast.length > 0) {
      const best = [...forecast].sort((a, b) => b.renewablePct - a.renewablePct)[0];
      return {
        label: best.label,
        renewablePct: best.renewablePct,
        savingsRs: Math.round(best.renewablePct * 0.4),
      };
    }
    return getBestChargingWindow('IN-WE');
  }, [forecast]);
  const gridColor = greennessColor(liveGrid.renewablePct);
  const gridBandLabel = greennessBandLabel(liveGrid.band);

  // Breakdown percentages
  const bkdTotal = Object.values(liveGrid.breakdown).reduce((a, b) => a + b, 0);
  const bkd = liveGrid.breakdown;
  const solarPct  = bkdTotal > 0 ? Math.round((bkd.solar / bkdTotal) * 100) : 0;
  const windPct   = bkdTotal > 0 ? Math.round((bkd.wind / bkdTotal) * 100) : 0;
  const hydroPct  = bkdTotal > 0 ? Math.round((bkd.hydro / bkdTotal) * 100) : 0;
  const nuclearPct= bkdTotal > 0 ? Math.round((bkd.nuclear / bkdTotal) * 100) : 0;
  const coalPct   = bkdTotal > 0 ? Math.round(((bkd.coal + bkd.gas) / bkdTotal) * 100) : 0;

  // Current IST hour for forecast highlighting
  const currentISTHour = Math.floor((new Date().getUTCHours() + 5.5) % 24);


  const handleNavigate = () => {
    if (!station) return;
    const { latitude, longitude, name, address } = station;
    
    // Use in-app navigation
    router.push({
      pathname: '/modal/navigation',
      params: {
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        name,
        address,
      },
    });
  };

  const handleReserve = (charger: Charger) => {
    // Navigate to reservation screen
    router.push({
      pathname: '/station/reserve',
      params: { 
        stationId: station?.id,
        chargerId: charger.id 
      }
    });
  };

  const handleToggleFavorite = async () => {
    await toggleFavorite();
  };

  // Loading state
  if (stationLoading || chargersLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('station.details_title', 'Station Details')}</Text>
          <View style={styles.favoriteButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>{t('station.loading', 'Loading station...')}</Text>
        </View>
      </View>
    );
  }

  // Error or not found state
  if (stationError || !station) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('station.details_title', 'Station Details')}</Text>
          <View style={styles.favoriteButton} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="warning-outline" size={48} color={themeColors.textSecondary} />
          <Text style={[styles.errorText, { color: themeColors.textPrimary }]}>{t('station.not_found', 'Station not found')}</Text>
          <Button variant="outline" onPress={() => router.back()} title={t('station.go_back', 'Go Back')} />
        </View>
      </View>
    );
  }

  const renderChargerCard = (charger: Charger) => {
    const chargerType = CHARGER_TYPES[charger.charger_type];
    const connectorType = CONNECTOR_TYPES[charger.connector_type];
    const statusConfig = CHARGER_STATUS_CONFIG[charger.status];
    const isAvailable = charger.status === 'available';

    // Dynamic pricing breakdown for this charger
    const priceQuote = getDynamicPriceQuote(charger.id, charger.price_per_kwh);
    const touColor = priceQuote.touAdjustment < 0 ? '#0E8E4F' : priceQuote.touAdjustment > 0 ? '#E2732B' : themeColors.textSecondary;
    const touPrefix = priceQuote.touAdjustment < 0 ? '−' : priceQuote.touAdjustment > 0 ? '+' : '';

    const statusLabelTranslated = 
      charger.status === 'available' ? t('reserve.status_available', 'Available') :
      charger.status === 'in_use' ? t('reserve.status_in_use', 'In Use') :
      charger.status === 'reserved' ? t('reserve.status_reserved', 'Reserved') :
      t('reserve.status_offline', 'Offline');

    return (
      <Card key={charger.id} style={[styles.chargerCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
        <View style={styles.chargerHeader}>
          <View style={styles.chargerInfo}>
            {/* Custom SVG connector icon */}
            <View style={[styles.chargerIcon, { backgroundColor: chargerType.color + '18' }]}>
              <ConnectorIcon
                chargerType={charger.charger_type}
                connectorType={charger.connector_type}
                size={44}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.chargerType, { color: themeColors.textPrimary }]}>{chargerType.name} · {connectorType.name}</Text>
              <Text style={[styles.chargerPower, { color: themeColors.primary }]}>⚡ {charger.power_kw} kW</Text>
            </View>
          </View>
          <Badge 
            variant={
              charger.status === 'available' ? 'success' :
              charger.status === 'in_use' ? 'warning' :
              charger.status === 'reserved' ? 'info' : 'default'
            }
          >
            {statusLabelTranslated}
          </Badge>
        </View>

        {/* Dynamic Pricing Breakdown */}
        <View style={[styles.priceBreakdown, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: themeColors.border }]}>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: themeColors.textSecondary }]}>{t('station.base_tariff', 'Base tariff')} ({priceQuote.provider})</Text>
            <Text style={[styles.priceVal, { color: themeColors.textPrimary }]}>₹{priceQuote.baseTariff.toFixed(2)}/kWh</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: themeColors.textSecondary }]}>{t('station.service_markup', 'Service markup')}</Text>
            <Text style={[styles.priceVal, { color: themeColors.textPrimary }]}>+₹{priceQuote.providerMarkup.toFixed(2)}/kWh</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: themeColors.textSecondary }]}>
              {priceQuote.touAdjustment < 0 ? t('station.green_discount_now', '🌿 Green discount (now)') : priceQuote.touAdjustment > 0 ? t('station.peak_surcharge', '⚡ Peak surcharge') : t('station.no_tou_adj', 'No ToU adjustment')}
            </Text>
            <Text style={[styles.priceVal, { color: touColor }]}>
              {priceQuote.touAdjustment !== 0 ? `${touPrefix}₹${Math.abs(priceQuote.touAdjustment).toFixed(2)}/kWh` : '—'}
            </Text>
          </View>
          <View style={[styles.priceDivider, { backgroundColor: themeColors.border }]} />
          <View style={styles.priceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.priceFinalLabel, { color: themeColors.textPrimary }]}>{t('station.final_price', 'Final price')}</Text>
              {priceQuote.isEstimate && (
                <View style={styles.estimateBadge}>
                  <Text style={styles.estimateBadgeText}>{t('station.estimate', 'estimate')}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.priceFinal, { color: themeColors.primary }]}>₹{priceQuote.finalPrice.toFixed(2)}/kWh</Text>
          </View>
        </View>

        <Button
          variant={isAvailable ? 'primary' : 'ghost'}
          size="sm"
          disabled={!isAvailable}
          onPress={() => handleReserve(charger)}
          style={styles.reserveButton}
          title={isAvailable ? t('station.reserve_now', 'Reserve Now') : statusLabelTranslated}
        />
      </Card>
    );
  };


  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
      {/* Header with Back Button */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('station.details_title', 'Station Details')}</Text>
        <TouchableOpacity onPress={handleToggleFavorite} style={styles.favoriteButton} disabled={favoriteLoading}>
          {favoriteLoading ? (
            <ActivityIndicator size="small" color={themeColors.textSecondary} />
          ) : (
            <View style={[styles.saveBtn, { borderColor: themeColors.primary }, isFavorite && { backgroundColor: themeColors.primary }]}>
              <Ionicons
                name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={isFavorite ? colors.white : themeColors.primary}
              />
              <Text style={[styles.saveBtnText, { color: isFavorite ? colors.white : themeColors.primary }]}>
                {isFavorite ? t('station.saved', 'Saved') : t('station.save', 'Save')}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Gallery with Skeleton Shimmer */}
        <View style={[styles.imageContainer, { backgroundColor: isDark ? '#1F2937' : colors.neutral[200] }]}>
          {(photosLoading || isPhotoLoading) && (
            <Skeleton
              width="100%"
              height={250}
              borderRadius={0}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          {photos.length > 0 ? (
            <>
              {/* Main Photo */}
              <TouchableOpacity 
                onPress={() => setShowPhotoModal(true)}
                activeOpacity={0.9}
              >
                <Image 
                  source={
                    photos[currentPhotoIndex] &&
                    photos[currentPhotoIndex].startsWith('http') &&
                    !photos[currentPhotoIndex].includes('unsplash')
                      ? { uri: photos[currentPhotoIndex] }
                      : getStationImageSource(station?.id || station?.name)
                  } 
                  style={styles.stationImage}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                  priority="high"
                  onLoadStart={() => setIsPhotoLoading(true)}
                  onLoad={() => setIsPhotoLoading(false)}
                  onError={() => setIsPhotoLoading(false)}
                />
              </TouchableOpacity>
              
              {/* Photo Navigation Dots */}
              {photos.length > 1 && (
                <View style={styles.photoDotsContainer}>
                  {photos.map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.photoDot,
                        index === currentPhotoIndex && styles.photoDotActive
                      ]}
                      onPress={() => setCurrentPhotoIndex(index)}
                    />
                  ))}
                </View>
              )}
              
              {/* Photo Counter */}
              <View style={styles.photoCounter}>
                <Ionicons name="images" size={14} color="#fff" />
                <Text style={styles.photoCounterText}>
                  {currentPhotoIndex + 1}/{photos.length}
                </Text>
              </View>
              
              {/* Tap to view hint */}
              <View style={styles.tapToViewBadge}>
                <Ionicons name="expand-outline" size={12} color="#fff" />
                <Text style={styles.tapToViewText}>{t('station.photos_enlarge', 'Tap to enlarge')}</Text>
              </View>
            </>
          ) : (
            <View style={[styles.noPhotoContainer, { backgroundColor: isDark ? '#1F2937' : colors.neutral[100] }]}>
              <Ionicons name="image-outline" size={48} color={themeColors.textSecondary} />
              <Text style={[styles.noPhotoText, { color: themeColors.textSecondary }]}>{t('station.no_photos', 'No photos available')}</Text>
            </View>
          )}
        </View>

        {/* Photo Thumbnails (if multiple photos) */}
        {photos.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={[styles.thumbnailsContainer, { backgroundColor: themeColors.surface }]}
            contentContainerStyle={styles.thumbnailsContent}
          >
            {photos.map((photo, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentPhotoIndex(index)}
                style={[
                  styles.thumbnail,
                  index === currentPhotoIndex && { borderColor: themeColors.primary }
                ]}
              >
                <Image 
                  source={photo && photo.startsWith('http') ? { uri: photo } : getStationImageSource(station?.id || station?.name)} 
                  style={styles.thumbnailImage}
                  contentFit="cover"
                  transition={100}
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Station Info */}
        <View style={[styles.stationInfo, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
          <Text style={[styles.stationName, { color: themeColors.textPrimary }]}>{station.name}</Text>
          
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={18} color={themeColors.textSecondary} />
            <Text style={[styles.address, { color: themeColors.textSecondary }]}>{station.address}, {station.city}</Text>
          </View>

          <View style={[styles.statsRow, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: themeColors.border }]}>
            <View style={styles.stat}>
              <Ionicons name="flash-outline" size={18} color={themeColors.primary} />
              <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{station.available_chargers}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('station.available_chargers', 'Available')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.stat}>
              <Ionicons name="navigate-outline" size={18} color={themeColors.primary} />
              <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>
                {dynamicDistanceKm !== null ? formatDistance(dynamicDistanceKm) : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                {dynamicDriveMinutes !== null ? `${dynamicDriveMinutes} ${t('station.min_drive', 'min drive')}` : t('station.distance', 'Distance')}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.stat}>
              <Ionicons name="star" size={18} color={colors.status.warning} />
              <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{station.rating?.toFixed(1) || 'N/A'}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('station.rating', 'Rating')}</Text>
            </View>
          </View>

          {/* Amenities */}
          {station.amenities && station.amenities.length > 0 && (
            <View style={styles.amenitiesSection}>
              <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>{t('station.amenities', 'Amenities')}</Text>
              <View style={styles.amenitiesRow}>
                {station.amenities.map((amenity) => (
                  <View key={amenity} style={[styles.amenityItem, { backgroundColor: isDark ? '#1F2937' : colors.primary[50] }]}>
                    <Ionicons 
                      name={AMENITY_ICONS[amenity] as any || 'checkmark-circle-outline'} 
                      size={20} 
                      color={themeColors.primary} 
                    />
                    <Text style={[styles.amenityText, { color: themeColors.textPrimary }]}>
                      {t(`station.amenity.${amenity}`, amenity.charAt(0).toUpperCase() + amenity.slice(1))}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Navigate Button */}
          <Button 
            variant="outline" 
            onPress={handleNavigate}
            style={styles.navigateButton}
            title={t('station.get_directions', 'Get Directions')}
            leftIcon={<Ionicons name="navigate-outline" size={18} color={themeColors.primary} />}
          />
        </View>

        {/* ── Greenness Gauge Section ── */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>{t('station.live_greenness', 'Live Grid Greenness')}</Text>
            <View style={[styles.qualityBadge, {
              backgroundColor: isLive ? '#22C55E20' : '#0FB8C920',
              borderColor: isLive ? '#22C55E40' : '#0FB8C940',
            }]}>
              <View style={[styles.qualityDot, { backgroundColor: isLive ? '#22C55E' : '#0FB8C9' }]} />
              <Text style={[styles.qualityText, { color: isLive ? '#15803D' : '#0FB8C9' }]}>{liveGrid.quality.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>{liveGrid.zoneName}</Text>

          {/* Big percentage + band */}
          <View style={styles.gaugeRow}>
            <View style={styles.gaugeCircle}>
              <View style={[styles.gaugeCircleInner, { borderColor: gridColor, backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                <Text style={[styles.gaugePct, { color: gridColor }]}>{liveGrid.renewablePct.toFixed(0)}%</Text>
                <Text style={[styles.gaugeLabel, { color: themeColors.textSecondary }]}>{t('station.renewable', 'renewable')}</Text>
              </View>
            </View>
            <View style={styles.gaugeInfo}>
              <View style={[styles.bandPill, { backgroundColor: gridColor + '20', borderColor: gridColor + '50' }]}>
                <Text style={[styles.bandPillText, { color: gridColor }]}>{gridBandLabel}</Text>
              </View>
              <View style={styles.gaugeStatRow}>
                <Text style={[styles.gaugeStatKey, { color: themeColors.textSecondary }]}>{t('station.carbon_free', 'Carbon-free')}</Text>
                <Text style={[styles.gaugeStatVal, { color: themeColors.textPrimary }]}>{liveGrid.carbonFreePct.toFixed(0)}%</Text>
              </View>
              <View style={styles.gaugeStatRow}>
                <Text style={[styles.gaugeStatKey, { color: themeColors.textSecondary }]}>{t('station.carbon_intensity', 'Carbon intensity')}</Text>
                <Text style={[styles.gaugeStatVal, { color: themeColors.textPrimary }]}>{liveGrid.carbonIntensity} gCO₂/kWh</Text>
              </View>
              <Text style={[styles.gaugeNote, { color: themeColors.textSecondary }]}>{t('station.renewable_note', 'Renewable ≠ Carbon-free (nuclear excluded)')}</Text>
            </View>
          </View>

          {/* Stacked source bar */}
          <Text style={[styles.sectionTitle, { fontSize: 13, marginTop: 16, marginBottom: 8, color: themeColors.textPrimary }]}>{t('station.grid_mix', 'Grid Mix Right Now')}</Text>
          <View style={styles.stackBar}>
            {solarPct > 0  && <View style={[styles.stackSegment, { flex: solarPct,   backgroundColor: '#F59E0B' }]} />}
            {windPct > 0   && <View style={[styles.stackSegment, { flex: windPct,    backgroundColor: '#0FB8C9' }]} />}
            {hydroPct > 0  && <View style={[styles.stackSegment, { flex: hydroPct,   backgroundColor: '#3B82F6' }]} />}
            {nuclearPct > 0 && <View style={[styles.stackSegment, { flex: nuclearPct, backgroundColor: '#8B5CF6' }]} />}
            {coalPct > 0   && <View style={[styles.stackSegment, { flex: coalPct,    backgroundColor: '#6B7280' }]} />}
          </View>
          <View style={styles.stackLegend}>
            <View style={styles.stackLegendItem}>
              <View style={[styles.stackLegendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.stackLegendText, { color: themeColors.textSecondary }]}>{t('profile.solar', 'Solar')} {solarPct}%</Text>
            </View>
            <View style={styles.stackLegendItem}>
              <View style={[styles.stackLegendDot, { backgroundColor: '#0FB8C9' }]} />
              <Text style={[styles.stackLegendText, { color: themeColors.textSecondary }]}>{t('profile.wind', 'Wind')} {windPct}%</Text>
            </View>
            <View style={styles.stackLegendItem}>
              <View style={[styles.stackLegendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={[styles.stackLegendText, { color: themeColors.textSecondary }]}>{t('profile.hydro', 'Hydro')} {hydroPct}%</Text>
            </View>
            <View style={styles.stackLegendItem}>
              <View style={[styles.stackLegendDot, { backgroundColor: '#8B5CF6' }]} />
              <Text style={[styles.stackLegendText, { color: themeColors.textSecondary }]}>Nuclear {nuclearPct}%</Text>
            </View>
            <View style={styles.stackLegendItem}>
              <View style={[styles.stackLegendDot, { backgroundColor: '#6B7280' }]} />
              <Text style={[styles.stackLegendText, { color: themeColors.textSecondary }]}>{t('profile.coal_gas', 'Coal+Gas')} {coalPct}%</Text>
            </View>
          </View>
        </View>

        {/* ── 24h Forecast Strip ── */}
        <View style={[styles.sectionCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>{t('station.forecast_24h', '24h Renewable Forecast')}</Text>
            <View style={[styles.qualityBadge, {
              backgroundColor: isLive ? '#22C55E20' : '#E0A81E20',
            }]}>
              <Text style={[styles.qualityText, { color: isLive ? '#15803D' : '#E0A81E' }]}>
                {isLive ? 'ML LIVE' : 'ESTIMATE'}
              </Text>
            </View>
          </View>

          {/* Best window callout */}
          <View style={[styles.bestWindowCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#F0FDF4', borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#BBF7D0' }]}>
            <Ionicons name="flash" size={16} color={themeColors.primary} />
            <Text style={[styles.bestWindowText, { color: themeColors.textPrimary }]}>
              {t('station.best_window', 'Best window:')} <Text style={{ color: themeColors.primary, fontWeight: '700' }}>{bestWindow.label}</Text>
              {' '}· {bestWindow.renewablePct.toFixed(0)}% {t('station.renewable', 'renewable')}
              {bestWindow.savingsRs > 0 ? ` · ${t('station.forecast_saves', 'saves ~₹')}${bestWindow.savingsRs}/session` : ''}
            </Text>
          </View>

          {/* Forecast bars */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
            <View style={styles.forecastRow}>
              {forecast.map((point) => {
                const barColor = greennessColor(point.renewablePct);
                const isCurrent = point.hourIST === currentISTHour;
                const barHeight = Math.max(12, Math.round((point.renewablePct / 100) * 56));
                return (
                  <View key={point.hourIST} style={styles.forecastBarWrap}>
                    {point.isRecommended && (
                      <View style={styles.recommendedDot} />
                    )}
                    <View style={[
                      styles.forecastBarOuter,
                      isCurrent && styles.forecastBarCurrent,
                      point.isRecommended && styles.forecastBarBest,
                    ]}>
                      <View style={[
                        styles.forecastBarInner,
                        { height: barHeight, backgroundColor: barColor },
                      ]} />
                    </View>
                    <Text style={[styles.forecastBarLabel, { color: isCurrent ? themeColors.primary : themeColors.textSecondary }]}>
                      {point.hourIST % 3 === 0 ? point.label.split(' ')[0] : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          <View style={styles.forecastScaleLegend}>
            <Text style={[styles.forecastScaleText, { color: themeColors.textSecondary }]}>{t('station.forecast_highlight', '◼ Highlighted = best charging window')}</Text>
            <Text style={[styles.forecastScaleText, { color: themeColors.textSecondary }]}>{t('station.forecast_now', '◉ = Now')}</Text>
          </View>
        </View>


        {/* Chargers Section */}
        <View style={styles.chargersSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
            {t('station.available_chargers', 'Available Chargers')} ({chargers.length})
          </Text>
          
          {chargers.length === 0 ? (
            <View style={styles.noChargersContainer}>
              <Ionicons name="flash-off-outline" size={32} color={themeColors.textSecondary} />
              <Text style={[styles.noChargersText, { color: themeColors.textSecondary }]}>{t('station.no_chargers', 'No chargers available')}</Text>
            </View>
          ) : (
            chargers.map(renderChargerCard)
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Full Screen Photo Modal */}
      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.photoModalContainer}>
          <TouchableOpacity 
            style={styles.photoModalClose}
            onPress={() => setShowPhotoModal(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={currentPhotoIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={styles.photoModalImage}
                resizeMode="contain"
              />
            )}
            keyExtractor={(_, index) => index.toString()}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentPhotoIndex(index);
            }}
          />
          
          <View style={styles.photoModalCounter}>
            <Text style={styles.photoModalCounterText}>
              {currentPhotoIndex + 1} / {photos.length}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  favoriteButton: {
    padding: 4,
    marginRight: -4,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primary[500],
    backgroundColor: 'transparent',
  },
  saveBtnActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[500],
  },
  saveBtnTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 250,
    backgroundColor: colors.neutral[200],
  },
  stationImage: {
    width: '100%',
    height: 250,
    backgroundColor: colors.neutral[300],
  },
  imageLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  imageLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.neutral[500],
  },
  noPhotoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  noPhotoText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.neutral[500],
  },
  photoDotsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  photoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  photoDotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  photoCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  photoCounterText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  tapToViewBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  tapToViewText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  thumbnailsContainer: {
    backgroundColor: colors.white,
    paddingVertical: 12,
  },
  thumbnailsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbnail: {
    width: 70,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 8,
  },
  thumbnailActive: {
    borderColor: colors.primary[500],
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  photoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  photoModalImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  photoModalCounter: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  photoModalCounterText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'transparent',
  },
  viewPhotosContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    alignItems: 'flex-start',
  },
  viewPhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary[500],
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  viewPhotosText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  tapHintText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  mapTypeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  mapTypeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  streetViewBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  streetViewText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  stationInfo: {
    backgroundColor: colors.white,
    padding: 20,
    marginBottom: 12,
  },
  stationName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[600],
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  statLabel: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.neutral[200],
  },
  amenitiesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 12,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.neutral[50],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  amenityText: {
    fontSize: 13,
    color: colors.neutral[700],
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navigateText: {
    color: colors.primary[500],
    fontSize: 16,
    fontWeight: '600',
  },
  chargersSection: {
    backgroundColor: colors.white,
    padding: 20,
  },
  chargerCard: {
    marginBottom: 12,
    padding: 16,
  },
  chargerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  chargerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  chargerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargerType: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  connectorType: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  chargerDetails: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
    paddingLeft: 56,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.neutral[600],
  },
  reserveButton: {
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.neutral[500],
  },
  errorText: {
    fontSize: 16,
    color: colors.neutral[600],
    marginBottom: 16,
  },
  noChargersContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  noChargersText: {
    fontSize: 14,
    color: colors.neutral[500],
  },

  // ── Section Card wrapper ───────────────────────────────────────────────
  sectionCard: {
    backgroundColor: colors.white,
    marginHorizontal: 0,
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.neutral[400],
    marginBottom: 14,
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  qualityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  qualityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Greenness Gauge ────────────────────────────────────────────────────
  gaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 4,
  },
  gaugeCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F6F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCircleInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugePct: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  gaugeLabel: {
    fontSize: 10,
    color: colors.neutral[400],
    fontWeight: '500',
  },
  gaugeInfo: {
    flex: 1,
    gap: 6,
  },
  bandPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  bandPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  gaugeStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gaugeStatKey: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  gaugeStatVal: {
    fontSize: 12,
    color: colors.neutral[700],
    fontWeight: '600',
  },
  gaugeNote: {
    fontSize: 10,
    color: colors.neutral[400],
    fontStyle: 'italic',
    marginTop: 2,
  },

  // ── Stacked source bar ─────────────────────────────────────────────────
  stackBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  stackSegment: {
    height: '100%',
  },
  stackLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stackLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stackLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stackLegendText: {
    fontSize: 12,
    color: colors.neutral[500],
  },

  // ── 24h Forecast Strip ─────────────────────────────────────────────────
  bestWindowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#E3F3E9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  bestWindowText: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral[700],
    lineHeight: 18,
  },
  forecastScroll: {
    marginBottom: 8,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 4,
    gap: 3,
  },
  forecastBarWrap: {
    alignItems: 'center',
    width: 22,
  },
  recommendedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0E8E4F',
    marginBottom: 3,
  },
  forecastBarOuter: {
    width: 14,
    height: 64,
    borderRadius: 4,
    backgroundColor: '#EAF0EA',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  forecastBarCurrent: {
    borderWidth: 1.5,
    borderColor: '#0FB8C9',
  },
  forecastBarBest: {
    borderWidth: 1.5,
    borderColor: '#0E8E4F',
  },
  forecastBarInner: {
    width: '100%',
    borderRadius: 4,
  },
  forecastBarLabel: {
    fontSize: 9,
    color: colors.neutral[400],
    marginTop: 3,
    fontWeight: '500',
  },
  forecastScaleLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  forecastScaleText: {
    fontSize: 10,
    color: colors.neutral[400],
  },

  // ── Dynamic Pricing Breakdown ──────────────────────────────────────────
  priceBreakdown: {
    backgroundColor: '#F8FAF8',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
    color: colors.neutral[600],
    flex: 1,
    marginRight: 8,
  },
  priceVal: {
    fontSize: 13,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  priceDivider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: 4,
  },
  priceFinalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  priceFinal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0E8E4F',
  },
  estimateBadge: {
    backgroundColor: '#E0A81E20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  estimateBadgeText: {
    fontSize: 10,
    color: '#E0A81E',
    fontWeight: '600',
  },

  // ── Connector / charger card ───────────────────────────────────────────
  chargerPower: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
    marginTop: 4,
  },
});
