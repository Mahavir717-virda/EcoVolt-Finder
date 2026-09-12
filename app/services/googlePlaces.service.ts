/**
 * Google Places Service
 * Fetches real photos and place details from Google Places API
 */

import Constants from 'expo-constants';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || 
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export interface PlacePhoto {
  photoReference: string;
  width: number;
  height: number;
  url: string;
}

export interface PlaceDetails {
  name: string;
  address: string;
  rating: number;
  photos: PlacePhoto[];
  openNow?: boolean;
  phoneNumber?: string;
  website?: string;
}

/**
 * Search for a place by name and location
 */
export async function searchPlace(
  query: string,
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=500&keyword=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results[0].place_id;
    }
    
    return null;
  } catch (error) {
    console.error('Error searching place:', error);
    return null;
  }
}

/**
 * Get place details including photos by place_id
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,rating,photos,opening_hours,formatted_phone_number,website&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.result) {
      const place = data.result;
      const photos: PlacePhoto[] = (place.photos || []).slice(0, 5).map((photo: any) => ({
        photoReference: photo.photo_reference,
        width: photo.width,
        height: photo.height,
        url: getPhotoUrl(photo.photo_reference, 800),
      }));
      
      return {
        name: place.name,
        address: place.formatted_address,
        rating: place.rating,
        photos,
        openNow: place.opening_hours?.open_now,
        phoneNumber: place.formatted_phone_number,
        website: place.website,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
}

/**
 * Get photo URL from photo reference
 */
export function getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`;
}

/**
 * Get multiple photos for a place
 */
export async function getPlacePhotos(
  latitude: number,
  longitude: number,
  placeName: string
): Promise<string[]> {
  try {
    // First, search for the place to get place_id
    const placeId = await searchPlace(placeName, latitude, longitude);
    
    if (!placeId) {
      return [];
    }
    
    // Get place details including photos
    const details = await getPlaceDetails(placeId);
    
    if (details && details.photos.length > 0) {
      return details.photos.map(photo => photo.url);
    }
    
    return [];
  } catch (error) {
    console.error('Error getting place photos:', error);
    return [];
  }
}

/**
 * Get first photo URL for a place (for thumbnails)
 */
export async function getPlaceFirstPhoto(
  latitude: number,
  longitude: number,
  placeName: string,
  maxWidth: number = 800
): Promise<string | null> {
  const photos = await getPlacePhotos(latitude, longitude, placeName);
  return photos.length > 0 ? photos[0] : null;
}

/**
 * Get static map with satellite view as fallback
 */
export function getSatelliteMapUrl(latitude: number, longitude: number, width = 800, height = 400): string {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=18&size=${width}x${height}&maptype=hybrid&markers=color:green%7C${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
}

/**
 * Get Street View image as another fallback option
 */
export function getStreetViewUrl(latitude: number, longitude: number, width = 800, height = 400): string {
  return `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&location=${latitude},${longitude}&fov=90&heading=235&pitch=10&key=${GOOGLE_MAPS_API_KEY}`;
}
