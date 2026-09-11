import axios from 'axios';
import { env } from '../config/env';
import { GeoPoint } from '../../../contracts/types';

interface DistanceMatrixResult {
  distanceKm: number;
  durationMinutes: number;
  isEstimated: boolean;
}

interface GeocodingResult {
  address: string;
  location: GeoPoint;
  placeId?: string;
}

class GoogleProxy {
  private apiKey: string;

  constructor() {
    this.apiKey = env.GOOGLE_SERVER_KEY || '';
  }

  /**
   * Haversine distance in km between two geo coordinates
   */
  private haversineDistance(p1: GeoPoint, p2: GeoPoint): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  /**
   * Computes distances from single origin to multiple destinations.
   * If Google Key is present and active, calls Google Distance Matrix API.
   * Otherwise falls back to Haversine with standard average city speed (30 km/h).
   */
  async getDistanceMatrix(
    origin: GeoPoint,
    destinations: GeoPoint[]
  ): Promise<DistanceMatrixResult[]> {
    if (this.apiKey) {
      try {
        const originsParam = `${origin.lat},${origin.lng}`;
        const destinationsParam = destinations
          .map((d) => `${d.lat},${d.lng}`)
          .join('|');

        const res = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
          params: {
            origins: originsParam,
            destinations: destinationsParam,
            key: this.apiKey,
            mode: 'driving',
          },
          timeout: 2500,
        });

        if (
          res.data &&
          res.data.status === 'OK' &&
          res.data.rows &&
          res.data.rows[0] &&
          Array.isArray(res.data.rows[0].elements)
        ) {
          const elements = res.data.rows[0].elements;
          return elements.map((elem: any, idx: number) => {
            if (elem.status === 'OK') {
              return {
                distanceKm: Number((elem.distance.value / 1000).toFixed(2)),
                durationMinutes: Math.ceil(elem.duration.value / 60),
                isEstimated: false,
              };
            }
            // If individual element failed, fallback to haversine for this one
            const fallbackDist = this.haversineDistance(origin, destinations[idx]);
            return {
              distanceKm: fallbackDist,
              durationMinutes: Math.ceil((fallbackDist / 30) * 60),
              isEstimated: true,
            };
          });
        }
      } catch (err: any) {
        console.warn(`[GoogleProxy] Distance Matrix API call failed: ${err.message}. Using Haversine.`);
      }
    }

    // Haversine fallback
    return destinations.map((dest) => {
      const dist = this.haversineDistance(origin, dest);
      const minutes = Math.max(1, Math.ceil((dist / 30) * 60)); // assuming 30 km/h average city driving
      return {
        distanceKm: dist,
        durationMinutes: minutes,
        isEstimated: true,
      };
    });
  }

  /**
   * Geocodes an address string to Lat/Lng.
   */
  async geocode(address: string): Promise<GeocodingResult | null> {
    if (this.apiKey) {
      try {
        const res = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: {
            address,
            key: this.apiKey,
          },
          timeout: 2500,
        });

        if (res.data && res.data.status === 'OK' && res.data.results && res.data.results.length > 0) {
          const first = res.data.results[0];
          return {
            address: first.formatted_address,
            location: {
              lat: first.geometry.location.lat,
              lng: first.geometry.location.lng,
            },
            placeId: first.place_id,
          };
        }
      } catch (err: any) {
        console.warn(`[GoogleProxy] Geocode API call failed: ${err.message}`);
      }
    }

    // Default fallback for demo / Ahmedabad area if API is unavailable
    return {
      address: address || 'Ahmedabad, Gujarat, India',
      location: {
        lat: 23.0225,
        lng: 72.5714,
      },
    };
  }

  /**
   * Reverse geocoding from Lat/Lng to address string.
   */
  async reverseGeocode(location: GeoPoint): Promise<string> {
    if (this.apiKey) {
      try {
        const res = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: {
            latlng: `${location.lat},${location.lng}`,
            key: this.apiKey,
          },
          timeout: 2500,
        });

        if (res.data && res.data.status === 'OK' && res.data.results && res.data.results.length > 0) {
          return res.data.results[0].formatted_address;
        }
      } catch (err: any) {
        console.warn(`[GoogleProxy] Reverse Geocode failed: ${err.message}`);
      }
    }

    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  }
}

export const googleProxy = new GoogleProxy();
