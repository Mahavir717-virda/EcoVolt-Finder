import { Badge, Button, Card } from '@/components/ui';
import { CHARGER_STATUS_CONFIG, CHARGER_TYPES, CONNECTOR_TYPES } from '@/constants/chargerTypes';
import { colors } from '@/constants/colors';
import { canAccessReservations } from '@/constants/plans';
import { useAuth } from '@/hooks/useAuth';
import { useChargers } from '@/hooks/useChargers';
import { useFavoriteStatus } from '@/hooks/useFavorites';
import { usePlacePhotos } from '@/hooks/usePlacePhotos';
import { useStation } from '@/hooks/useStations';
import { getStationImageSource } from '@/constants/stationImages';
import type { Charger } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  
  // Fetch station data
  const { station, loading: stationLoading, error: stationError } = useStation(stationId || '');
  
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
    const isPremium = profile?.plan_type === 'premium';
    
    if (!canAccessReservations(isPremium)) {
      // Show upgrade modal
      router.push('/modal/upgrade');
      return;
    }
    
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
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.neutral[800]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Station Details</Text>
          <View style={styles.favoriteButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading station...</Text>
        </View>
      </View>
    );
  }

  // Error or not found state
  if (stationError || !station) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.neutral[800]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Station Details</Text>
          <View style={styles.favoriteButton} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="warning-outline" size={48} color={colors.neutral[400]} />
          <Text style={styles.errorText}>Station not found</Text>
          <Button variant="outline" onPress={() => router.back()} title="Go Back" />
        </View>
      </View>
    );
  }

  const renderChargerCard = (charger: Charger) => {
    const chargerType = CHARGER_TYPES[charger.charger_type];
    const connectorType = CONNECTOR_TYPES[charger.connector_type];
    const statusConfig = CHARGER_STATUS_CONFIG[charger.status];
    const isAvailable = charger.status === 'available';

    return (
      <Card key={charger.id} style={styles.chargerCard}>
        <View style={styles.chargerHeader}>
          <View style={styles.chargerInfo}>
            <View style={[styles.chargerIcon, { backgroundColor: chargerType.color + '20' }]}>
              <Ionicons name="flash" size={20} color={chargerType.color} />
            </View>
            <View>
              <Text style={styles.chargerType}>{chargerType.name}</Text>
              <Text style={styles.connectorType}>{connectorType.name}</Text>
            </View>
          </View>
          <Badge 
            variant={
              charger.status === 'available' ? 'success' :
              charger.status === 'in_use' ? 'warning' :
              charger.status === 'reserved' ? 'info' : 'default'
            }
          >
            {statusConfig.label}
          </Badge>
        </View>
        
        <View style={styles.chargerDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="speedometer-outline" size={16} color={colors.neutral[500]} />
            <Text style={styles.detailText}>{charger.power_kw} kW</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="pricetag-outline" size={16} color={colors.neutral[500]} />
            <Text style={styles.detailText}>₹{charger.price_per_kwh}/kWh</Text>
          </View>
        </View>

        <Button
          variant={isAvailable ? 'primary' : 'ghost'}
          size="sm"
          disabled={!isAvailable}
          onPress={() => handleReserve(charger)}
          style={styles.reserveButton}
          title={isAvailable ? 'Reserve Now' : statusConfig.label}
        />
      </Card>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Station Details</Text>
        <TouchableOpacity onPress={handleToggleFavorite} style={styles.favoriteButton} disabled={favoriteLoading}>
          {favoriteLoading ? (
            <ActivityIndicator size="small" color={colors.neutral[500]} />
          ) : (
            <Ionicons 
              name={isFavorite ? 'heart' : 'heart-outline'} 
              size={24} 
              color={isFavorite ? colors.status.error : colors.neutral[800]} 
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Gallery */}
        <View style={styles.imageContainer}>
          {photosLoading ? (
            <View style={styles.imageLoading}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text style={styles.imageLoadingText}>Loading photos...</Text>
            </View>
          ) : photos.length > 0 ? (
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
                <Text style={styles.tapToViewText}>Tap to enlarge</Text>
              </View>
            </>
          ) : (
            <View style={styles.noPhotoContainer}>
              <Ionicons name="image-outline" size={48} color={colors.neutral[400]} />
              <Text style={styles.noPhotoText}>No photos available</Text>
            </View>
          )}
        </View>

        {/* Photo Thumbnails (if multiple photos) */}
        {photos.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.thumbnailsContainer}
            contentContainerStyle={styles.thumbnailsContent}
          >
            {photos.map((photo, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentPhotoIndex(index)}
                style={[
                  styles.thumbnail,
                  index === currentPhotoIndex && styles.thumbnailActive
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
        <View style={styles.stationInfo}>
          <Text style={styles.stationName}>{station.name}</Text>
          
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={18} color={colors.neutral[500]} />
            <Text style={styles.address}>{station.address}, {station.city}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="flash-outline" size={18} color={colors.primary[500]} />
              <Text style={styles.statValue}>{station.available_chargers}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Ionicons name="battery-charging-outline" size={18} color={colors.neutral[500]} />
              <Text style={styles.statValue}>{station.total_chargers}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Ionicons name="star" size={18} color={colors.status.warning} />
              <Text style={styles.statValue}>{station.rating?.toFixed(1) || 'N/A'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          {/* Amenities */}
          {station.amenities && station.amenities.length > 0 && (
            <View style={styles.amenitiesSection}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesRow}>
                {station.amenities.map((amenity) => (
                  <View key={amenity} style={styles.amenityItem}>
                    <Ionicons 
                      name={AMENITY_ICONS[amenity] as any || 'checkmark-circle-outline'} 
                      size={20} 
                      color={colors.primary[500]} 
                    />
                    <Text style={styles.amenityText}>
                      {amenity.charAt(0).toUpperCase() + amenity.slice(1)}
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
            title="Get Directions"
            leftIcon={<Ionicons name="navigate-outline" size={18} color={colors.primary[500]} />}
          />
        </View>

        {/* Chargers Section */}
        <View style={styles.chargersSection}>
          <Text style={styles.sectionTitle}>
            Available Chargers ({chargers.length})
          </Text>
          
          {chargers.length === 0 ? (
            <View style={styles.noChargersContainer}>
              <Ionicons name="flash-off-outline" size={32} color={colors.neutral[400]} />
              <Text style={styles.noChargersText}>No chargers available</Text>
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
    padding: 8,
    marginRight: -8,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
});
