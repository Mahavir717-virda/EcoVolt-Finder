/**
 * Distance calculation utilities
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371; // Earth's radius in kilometers
  
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);
  
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  }
  return `${Math.round(distanceKm)} km`;
}

/**
 * Estimate driving time based on distance
 * Assumes average speed of 40 km/h for city driving
 */
export function estimateDrivingTime(distanceKm: number, avgSpeedKmh: number = 40): number {
  return Math.round((distanceKm / avgSpeedKmh) * 60); // Returns minutes
}

/**
 * Format estimated time
 */
export function formatETA(minutes: number): string {
  if (minutes < 1) {
    return '< 1 min';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${mins} min`;
}

/**
 * Sort locations by distance from a reference point
 */
export function sortByDistance<T extends Coordinates>(
  locations: T[],
  referencePoint: Coordinates
): (T & { distance: number })[] {
  return locations
    .map(location => ({
      ...location,
      distance: calculateDistance(referencePoint, location),
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Filter locations within a radius
 */
export function filterByRadius<T extends Coordinates>(
  locations: T[],
  center: Coordinates,
  radiusKm: number
): T[] {
  return locations.filter(
    location => calculateDistance(center, location) <= radiusKm
  );
}

/**
 * Get bounding box for a center point and radius
 * Useful for map region calculations
 */
export function getBoundingBox(
  center: Coordinates,
  radiusKm: number
): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} {
  const latDelta = radiusKm / 111; // 1 degree latitude ≈ 111 km
  const lonDelta = radiusKm / (111 * Math.cos(toRadians(center.latitude)));
  
  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLon: center.longitude - lonDelta,
    maxLon: center.longitude + lonDelta,
  };
}
