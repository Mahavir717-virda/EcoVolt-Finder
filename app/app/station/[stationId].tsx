import { Badge, Button, Card, Skeleton, StationDetailSkeleton } from '@/components/ui';
import { ConnectorIcon } from '@/components/ui/ConnectorIcon';
import { LiveGridSection } from '@/components/station';
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
    await toggleFavorite(station || undefined);
  };

  // Loading state
  if (stationLoading && !station) {
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
        <ScrollView showsVerticalScrollIndicator={false}>
          <StationDetailSkeleton />
        </ScrollView>
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
                    photos[currentPhotoIndex] && photos[currentPhotoIndex].startsWith('http')
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

        {/* Station Info Card */}
        <View style={[styles.stationCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.stationName, { color: themeColors.textPrimary }]}>{station.name}</Text>
          
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color={themeColors.primary} />
            <Text style={[styles.address, { color: themeColors.textSecondary }]}>
              {station.address}{station.city ? `, ${station.city}` : ''}
            </Text>
          </View>

          {/* Quick Stats 3-Pill Row */}
          <View style={[styles.statsRow, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: themeColors.border }]}>
            <View style={styles.stat}>
              <Ionicons name="flash" size={16} color={themeColors.primary} />
              <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{station.available_chargers}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('station.available_chargers', 'Available')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.stat}>
              <Ionicons name="navigate-outline" size={16} color={themeColors.primary} />
              <Text style={[styles.statValue, { color: themeColors.textPrimary }]} numberOfLines={1}>
                {dynamicDistanceKm !== null ? formatDistance(dynamicDistanceKm) : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]} numberOfLines={1}>
                {dynamicDriveMinutes !== null ? `${dynamicDriveMinutes} ${t('station.min_drive', 'min')}` : t('station.distance', 'Distance')}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.stat}>
              <Ionicons name="star" size={16} color={colors.status.warning} />
              <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{station.rating?.toFixed(1) || '4.8'}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('station.rating', 'Rating')}</Text>
            </View>
          </View>

          {/* Amenities */}
          {station.amenities && station.amenities.length > 0 && (
            <View style={styles.amenitiesSection}>
              <Text style={[styles.subSectionTitle, { color: themeColors.textPrimary }]}>{t('station.amenities', 'Amenities')}</Text>
              <View style={styles.amenitiesRow}>
                {station.amenities.map((amenity) => (
                  <View key={amenity} style={[styles.amenityItem, { backgroundColor: isDark ? '#263345' : colors.primary[50], borderColor: isDark ? '#374151' : 'transparent' }]}>
                    <Ionicons 
                      name={AMENITY_ICONS[amenity] as any || 'checkmark-circle-outline'} 
                      size={15} 
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

        {/* ── Live Grid Greenness & 24h Forecast Section ── */}
        <View style={styles.sectionWrap}>
          <LiveGridSection
            liveGrid={liveGrid}
            forecast={forecast}
            bestWindow={bestWindow}
            isLive={isLive}
            t={t}
          />
        </View>

        {/* Chargers Section */}
        <View style={styles.sectionWrap}>
          <View style={styles.chargersHeaderRow}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
              {t('station.available_chargers', 'Available Chargers')}
            </Text>
            <View style={[styles.countBadge, { backgroundColor: isDark ? '#1F2937' : colors.primary[50] }]}>
              <Text style={[styles.countBadgeText, { color: themeColors.primary }]}>
                {chargers.length} {chargers.length === 1 ? 'Port' : 'Ports'}
              </Text>
            </View>
          </View>
          
          {chargers.length === 0 ? (
            <View style={[styles.noChargersContainer, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
              <Ionicons name="flash-off-outline" size={32} color={themeColors.textSecondary} />
              <Text style={[styles.noChargersText, { color: themeColors.textSecondary }]}>{t('station.no_chargers', 'No chargers available')}</Text>
            </View>
          ) : (
            chargers.map(renderChargerCard)
          )}
        </View>

        <View style={{ height: 32 }} />
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  favoriteButton: {
    padding: 4,
    marginRight: -4,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  saveBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 230,
  },
  stationImage: {
    width: '100%',
    height: 230,
  },
  noPhotoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    marginTop: 8,
    fontSize: 13,
  },
  photoDotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  photoDotActive: {
    backgroundColor: '#fff',
    width: 20,
  },
  photoCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 12,
  },
  photoCounterText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  tapToViewBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 12,
  },
  tapToViewText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  thumbnailsContainer: {
    paddingVertical: 10,
  },
  thumbnailsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbnail: {
    width: 64,
    height: 46,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 6,
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

  // ── Station Info Card ──────────────────────────────────────────────────
  stationCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  stationName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontFamily: 'Manrope_800ExtraBold',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
  },
  address: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Manrope_500Medium',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  stat: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Manrope_800ExtraBold',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  amenitiesSection: {
    gap: 8,
    marginTop: 2,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  amenityText: {
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },

  // ── Section Container ──────────────────────────────────────────────────
  sectionWrap: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  chargersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },

  // ── Charger Card ───────────────────────────────────────────────────────
  chargerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  chargerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
    fontSize: 14.5,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  chargerPower: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    fontFamily: 'Manrope_600SemiBold',
  },
  priceBreakdown: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginVertical: 10,
    gap: 6,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12.5,
    flex: 1,
    marginRight: 8,
    fontFamily: 'Manrope_500Medium',
  },
  priceVal: {
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  priceDivider: {
    height: 1,
    marginVertical: 3,
  },
  priceFinalLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  priceFinal: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Manrope_800ExtraBold',
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
    fontFamily: 'Manrope_600SemiBold',
  },
  reserveButton: {
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  noChargersContainer: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  noChargersText: {
    fontSize: 14,
  },
});
