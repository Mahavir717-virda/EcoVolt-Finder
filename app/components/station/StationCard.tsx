import { Card } from '@/components/ui';
import { colors } from '@/constants/colors';
import type { Station } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StationCardProps {
  station: Station;
  distance?: number; // in km
  onPress?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  variant?: 'default' | 'compact';
}

export function StationCard({
  station,
  distance,
  onPress,
  onFavorite,
  isFavorite = false,
  variant = 'default',
}: StationCardProps) {
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
    (station.available_chargers / station.total_chargers) * 100;

  const getAvailabilityColor = () => {
    if (availabilityPercentage >= 50) return colors.status.success;
    if (availabilityPercentage >= 20) return colors.status.warning;
    return colors.status.error;
  };

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

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Card style={styles.card}>
        {/* Station Image */}
        {station.image_url ? (
          <Image
            source={{ uri: station.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="flash" size={32} color={colors.neutral[400]} />
          </View>
        )}

        {/* Favorite Button */}
        {onFavorite && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? colors.status.error : colors.white}
            />
          </TouchableOpacity>
        )}

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>
              {station.name}
            </Text>
            {station.rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color={colors.status.warning} />
                <Text style={styles.rating}>{station.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>

          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color={colors.neutral[500]} />
            <Text style={styles.address} numberOfLines={1}>
              {station.address}
            </Text>
          </View>

          <View style={styles.footer}>
            {/* Availability */}
            <View style={styles.availability}>
              <View style={[styles.availabilityIndicator, { backgroundColor: getAvailabilityColor() }]} />
              <Text style={styles.availabilityText}>
                <Text style={{ fontWeight: '600' }}>{station.available_chargers}</Text>
                /{station.total_chargers} available
              </Text>
            </View>

            {/* Greenness Indicator */}
            {station.greenness_score !== undefined && (
              <View style={styles.greenBadge}>
                <Ionicons name="leaf" size={12} color="#10B981" />
                <Text style={styles.greenText}>{station.greenness_score}% Clean</Text>
              </View>
            )}

            {/* Distance */}
            {distance !== undefined && (
              <View style={styles.distanceContainer}>
                <Ionicons name="navigate-outline" size={14} color={colors.primary[500]} />
                <Text style={styles.distanceValue}>
                  {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`}
                </Text>
              </View>
            )}
          </View>

          {/* Amenities Preview */}
          {station.amenities && station.amenities.length > 0 && (
            <View style={styles.amenities}>
              {station.amenities.slice(0, 4).map((amenity, index) => (
                <View key={index} style={styles.amenityBadge}>
                  <Text style={styles.amenityText}>
                    {amenity.charAt(0).toUpperCase() + amenity.slice(1)}
                  </Text>
                </View>
              ))}
              {station.amenities.length > 4 && (
                <Text style={styles.moreAmenities}>
                  +{station.amenities.length - 4}
                </Text>
              )}
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 140,
  },
  imagePlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  address: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral[500],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availabilityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityText: {
    fontSize: 13,
    color: colors.neutral[600],
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary[600],
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  amenityBadge: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  amenityText: {
    fontSize: 11,
    color: colors.neutral[600],
  },
  moreAmenities: {
    fontSize: 11,
    color: colors.neutral[400],
    paddingVertical: 4,
  },
  // Compact variant
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
  greenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  greenText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
});

export default StationCard;
