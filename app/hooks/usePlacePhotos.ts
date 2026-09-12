/**
 * usePlacePhotos Hook
 * Fetches and caches Google Places photos for stations
 */

import { getPlacePhotos, getSatelliteMapUrl } from '@/services/googlePlaces.service';
import { useCallback, useEffect, useState } from 'react';

interface UsePlacePhotosResult {
  photos: string[];
  primaryPhoto: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// Simple in-memory cache
const photoCache: Map<string, string[]> = new Map();

export function usePlacePhotos(
  latitude: number | undefined,
  longitude: number | undefined,
  placeName: string | undefined,
  existingImageUrl?: string | null
): UsePlacePhotosResult {
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `${latitude}-${longitude}-${placeName}`;

  const fetchPhotos = useCallback(async () => {
    if (!latitude || !longitude || !placeName) {
      setLoading(false);
      return;
    }

    // Check cache first
    if (photoCache.has(cacheKey)) {
      setPhotos(photoCache.get(cacheKey) || []);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedPhotos = await getPlacePhotos(latitude, longitude, placeName);
      
      if (fetchedPhotos.length > 0) {
        photoCache.set(cacheKey, fetchedPhotos);
        setPhotos(fetchedPhotos);
      } else {
        // Use existing image or satellite map as fallback
        const fallback = existingImageUrl || getSatelliteMapUrl(latitude, longitude);
        setPhotos([fallback]);
      }
    } catch (err) {
      console.error('Error fetching place photos:', err);
      setError('Failed to load photos');
      // Use fallback
      const fallback = existingImageUrl || getSatelliteMapUrl(latitude, longitude);
      setPhotos([fallback]);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, placeName, existingImageUrl, cacheKey]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const primaryPhoto = photos.length > 0 ? photos[0] : null;

  return {
    photos,
    primaryPhoto,
    loading,
    error,
    refresh: fetchPhotos,
  };
}

/**
 * Get photo URL directly without hook (for simple cases)
 */
export function getStationImageUrl(
  latitude: number | undefined,
  longitude: number | undefined,
  existingImageUrl?: string | null
): string {
  // If station has its own image, use it
  if (existingImageUrl) {
    return existingImageUrl;
  }
  
  // Otherwise use satellite map
  if (latitude && longitude) {
    return getSatelliteMapUrl(latitude, longitude);
  }
  
  // Default placeholder
  return 'https://via.placeholder.com/800x400?text=No+Image';
}
