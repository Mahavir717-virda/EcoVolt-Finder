import { GeoPoint } from '@contracts/types';

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Decodes a Google Encoded Polyline string into an array of LatLng points.
 * Standard algorithm with 1e5 precision.
 */
export function decodePolyline(encoded: string): LatLng[] {
  if (!encoded || typeof encoded !== 'string') return [];

  const points: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

/**
 * Encodes an array of LatLng points into a Google Encoded Polyline string.
 */
export function encodePolyline(points: LatLng[]): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  const encodePoint = (current: number, previous: number) => {
    let coordinate = Math.round(current * 1e5) - Math.round(previous * 1e5);
    coordinate <<= 1;
    if (coordinate < 0) {
      coordinate = ~coordinate;
    }

    let output = '';
    while (coordinate >= 0x20) {
      output += String.fromCharCode((0x20 | (coordinate & 0x1f)) + 63);
      coordinate >>= 5;
    }
    output += String.fromCharCode(coordinate + 63);
    return output;
  };

  for (const point of points) {
    encoded += encodePoint(point.latitude, prevLat);
    encoded += encodePoint(point.longitude, prevLng);
    prevLat = point.latitude;
    prevLng = point.longitude;
  }

  return encoded;
}

/**
 * Generates intermediate road waypoints between origin and destination
 * with realistic road curvature for testing and Expo Go mock visual rendering.
 */
export function generateInterpolatedRoute(
  origin: GeoPoint,
  destination: GeoPoint,
  steps = 8
): LatLng[] {
  const points: LatLng[] = [];
  points.push({ latitude: origin.lat, longitude: origin.lng });

  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    // Add small curvature offset perpendicular to path
    const offset = Math.sin(t * Math.PI) * 0.003 * (i % 2 === 0 ? 1 : -0.5);
    const lat = origin.lat + (destination.lat - origin.lat) * t + offset;
    const lng = origin.lng + (destination.lng - origin.lng) * t - offset;
    points.push({ latitude: lat, longitude: lng });
  }

  points.push({ latitude: destination.lat, longitude: destination.lng });
  return points;
}
