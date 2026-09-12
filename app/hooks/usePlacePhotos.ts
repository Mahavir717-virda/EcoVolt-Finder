/**
 * usePlacePhotos Hook
 * Fetches and caches Google Places photos for stations with instant local fallback
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
  const initialPhotos = existingImageUrl ? [existingImageUrl] : [];
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [loading, setLoading] = useState(initialPhotos.length === 0);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `${latitude}-${longitude}-${placeName}`;

  const fetchPhotos = useCallback(async () => {
    if (!latitude || !longitude || !placeName) {
      setLoading(false);
      return;
    }

    // Check cache first
    if (photoCache.has(cacheKey)) {
      const cached = photoCache.get(cacheKey) || [];
      if (cached.length > 0) {
        setPhotos(cached);
      }
      setLoading(false);
      return;
    }

    // If we don't have any images yet, show loading
    if (photos.length === 0 && !existingImageUrl) {
      setLoading(true);
    }
    setError(null);

    try {
      const fetchedPhotos = await getPlacePhotos(latitude, longitude, placeName);
      
      if (fetchedPhotos.length > 0) {
        photoCache.set(cacheKey, fetchedPhotos);
        setPhotos(fetchedPhotos);
      } else {
        const fallback = existingImageUrl || getSatelliteMapUrl(latitude, longitude);
        setPhotos([fallback]);
      }
    } catch (err) {
      console.warn('Place photos fallback to local image asset:', err);
      const fallback = existingImageUrl || getSatelliteMapUrl(latitude, longitude);
      setPhotos([fallback]);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, placeName, existingImageUrl, cacheKey, photos.length]);

  useEffect(() => {
    if (existingImageUrl && photos.length === 0) {
      setPhotos([existingImageUrl]);
      setLoading(false);
    }
  }, [existingImageUrl, photos.length]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const primaryPhoto = photos.length > 0 ? photos[0] : null;

  return {
    photos,
    primaryPhoto,
    loading: loading && photos.length === 0,
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
  if (existingImageUrl) {
    return existingImageUrl;
  }
  
  if (latitude && longitude) {
    return getSatelliteMapUrl(latitude, longitude);
  }
  
  return 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&auto=format&fit=crop&q=80';
}
