/**
 * DirectionsMap Component
 * In-app directions and routing powered by Leaflet & OSRM (zero Google Maps JS API key dependency)
 * Includes native launcher for Google Maps / Apple Maps turn-by-turn navigation
 */

import { colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useUserLocation } from '@/hooks/useUserLocation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Only import WebView on native platforms
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DirectionsMapProps {
  destination: {
    latitude: number;
    longitude: number;
    name: string;
    address?: string;
  };
  onClose?: () => void;
  style?: any;
}

interface RouteInfo {
  distance: string;
  duration: string;
  steps: Array<{
    instruction: string;
    distance: string;
    maneuver?: string;
  }>;
}

export function DirectionsMap({ destination, onClose, style }: DirectionsMapProps) {
  const webViewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // Handle messages from iframe on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWindowMessage = (event: MessageEvent) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data.type === 'routeInfo') {
            setRouteInfo({
              distance: data.distance,
              duration: data.duration,
              steps: data.steps,
            });
            setLoading(false);
          } else if (data.type === 'error') {
            setError(data.message);
            setLoading(false);
          }
        } catch {}
      };
      window.addEventListener('message', handleWindowMessage);
      return () => window.removeEventListener('message', handleWindowMessage);
    }
  }, []);

  const { coords: globalCoords, isLoading: locationLoading } = useUserLocation();

  useEffect(() => {
    if (!locationLoading && globalCoords) {
      setUserLocation({
        latitude: globalCoords.latitude,
        longitude: globalCoords.longitude,
      });
    }
  }, [globalCoords, locationLoading]);

  // Launch external native navigation app (Google Maps / Apple Maps)
  const openExternalNavigation = useCallback(() => {
    const lat = destination.latitude;
    const lng = destination.longitude;
    const label = encodeURIComponent(destination.name);

    const scheme = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });

    Linking.canOpenURL(scheme || '')
      .then((supported) => {
        if (supported) {
          Linking.openURL(scheme || '');
        } else {
          Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
        }
      })
      .catch(() => {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
      });
  }, [destination]);

  // Leaflet + OSRM directions HTML (100% free, zero Google JS API key requirement)
  const mapHtml = useCallback(() => {
    if (!userLocation) return '';

    const origin = { lat: userLocation.latitude, lng: userLocation.longitude };
    const dest = { lat: destination.latitude, lng: destination.longitude };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body, #map { width: 100%; height: 100%; background: #0F172A; }
            .leaflet-control-attribution { display: none; }
            .user-pin {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #3B82F6;
              box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.3);
              border: 2px solid #FFFFFF;
            }
            .station-pin {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: #10B981;
              color: #FFFFFF;
              font-size: 18px;
              font-weight: bold;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4);
              border: 2px solid #FFFFFF;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            function sendMessage(data) {
              const msg = JSON.stringify(data);
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(msg);
              } else if (window.parent) {
                window.parent.postMessage(msg, '*');
              }
            }

            const map = L.map('map', { zoomControl: false }).setView([${origin.lat}, ${origin.lng}], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

            // User marker
            const userIcon = L.divIcon({
              className: '',
              html: '<div class="user-pin"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            L.marker([${origin.lat}, ${origin.lng}], { icon: userIcon }).addTo(map);

            // Destination marker
            const destIcon = L.divIcon({
              className: '',
              html: '<div class="station-pin">⚡</div>',
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            });
            L.marker([${dest.lat}, ${dest.lng}], { icon: destIcon }).addTo(map);

            // Fetch route from OSRM
            const osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' +
              '${origin.lng},${origin.lat};${dest.lng},${dest.lat}' +
              '?overview=full&geometries=geojson&steps=true';

            fetch(osrmUrl)
              .then(res => res.json())
              .then(data => {
                if (data.routes && data.routes.length > 0) {
                  const r = data.routes[0];
                  const distKm = (r.distance / 1000).toFixed(1) + ' km';
                  const durMin = Math.round(r.duration / 60) + ' min';
                  const coords = r.geometry.coordinates.map(c => [c[1], c[0]]);

                  const polyline = L.polyline(coords, {
                    color: '#10B981',
                    weight: 5,
                    opacity: 0.9,
                  }).addTo(map);

                  map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

                  const steps = [];
                  if (r.legs && r.legs[0] && r.legs[0].steps) {
                    r.legs[0].steps.forEach(s => {
                      if (s.maneuver) {
                        steps.push({
                          instruction: s.name ? (s.maneuver.type + ' onto ' + s.name) : s.maneuver.type,
                          distance: (s.distance / 1000).toFixed(1) + ' km',
                          maneuver: s.maneuver.modifier || s.maneuver.type
                        });
                      }
                    });
                  }

                  sendMessage({
                    type: 'routeInfo',
                    distance: distKm,
                    duration: durMin,
                    steps: steps.length > 0 ? steps : [{ instruction: 'Head towards destination', distance: distKm }]
                  });
                } else {
                  fallbackLine();
                }
              })
              .catch(() => fallbackLine());

            function fallbackLine() {
              const polyline = L.polyline([
                [${origin.lat}, ${origin.lng}],
                [${dest.lat}, ${dest.lng}]
              ], {
                color: '#10B981',
                weight: 4,
                dashArray: '6, 8',
              }).addTo(map);
              map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

              // Approximate direct line distance
              const dLat = (${dest.lat} - ${origin.lat}) * 111;
              const dLng = (${dest.lng} - ${origin.lng}) * 111 * Math.cos(${origin.lat} * Math.PI / 180);
              const directDist = Math.sqrt(dLat*dLat + dLng*dLng).toFixed(1) + ' km';

              sendMessage({
                type: 'routeInfo',
                distance: directDist,
                duration: Math.round(parseFloat(directDist) * 2.5) + ' min',
                steps: [{ instruction: 'Follow navigation to ' + '${destination.name}', distance: directDist }]
              });
            }
          </script>
        </body>
      </html>
    `;
  }, [userLocation, destination]);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'routeInfo') {
        setRouteInfo({
          distance: data.distance,
          duration: data.duration,
          steps: data.steps,
        });
        setLoading(false);
      } else if (data.type === 'error') {
        setError(data.message);
        setLoading(false);
      }
    } catch {}
  }, []);

  const getManeuverIcon = (maneuver: string): keyof typeof Ionicons.glyphMap => {
    if (maneuver.includes('left')) return 'arrow-back';
    if (maneuver.includes('right')) return 'arrow-forward';
    if (maneuver.includes('uturn')) return 'return-down-back';
    if (maneuver.includes('straight')) return 'arrow-up';
    if (maneuver.includes('merge')) return 'git-merge';
    if (maneuver.includes('ramp')) return 'trending-up';
    if (maneuver.includes('roundabout')) return 'sync';
    return 'navigate';
  };

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setError(null)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!userLocation) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Locating nearest route...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Map View */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <iframe
            ref={webViewRef}
            srcDoc={mapHtml()}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Directions Map"
          />
        ) : WebView ? (
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml() }}
            style={styles.map}
            scrollEnabled={false}
            onMessage={handleMessage}
            onError={() => setError('Failed to load map')}
          />
        ) : null}

        {loading && (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        )}
      </View>

      {/* Route Info Panel */}
      <View style={styles.routePanel}>
        {routeInfo && (
          <View style={styles.routeSummary}>
            <View style={styles.summaryItem}>
              <Ionicons name="time" size={24} color={colors.primary[500]} />
              <Text style={styles.summaryValue}>{routeInfo.duration}</Text>
              <Text style={styles.summaryLabel}>Duration</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="navigate" size={24} color={colors.primary[500]} />
              <Text style={styles.summaryValue}>{routeInfo.distance}</Text>
              <Text style={styles.summaryLabel}>Distance</Text>
            </View>
          </View>
        )}

        {/* Destination Header */}
        <View style={styles.destinationInfo}>
          <View style={styles.destinationIcon}>
            <Ionicons name="location" size={20} color="#fff" />
          </View>
          <View style={styles.destinationText}>
            <Text style={styles.destinationName}>{destination.name}</Text>
            {destination.address && (
              <Text style={styles.destinationAddress} numberOfLines={1}>
                {destination.address}
              </Text>
            )}
          </View>
        </View>

        {/* Start Native Navigation CTA */}
        <TouchableOpacity style={styles.startNavButton} onPress={openExternalNavigation} activeOpacity={0.85}>
          <Ionicons name="navigate" size={20} color="#fff" />
          <Text style={styles.startNavText}>Start GPS Navigation</Text>
        </TouchableOpacity>

        {/* Turn-by-Turn Steps Toggle */}
        {routeInfo && routeInfo.steps.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowSteps(!showSteps)}
            >
              <Text style={styles.toggleText}>
                {showSteps ? 'Hide Turn-by-Turn' : 'Show Turn-by-Turn'}
              </Text>
              <Ionicons
                name={showSteps ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.primary[500]}
              />
            </TouchableOpacity>

            {showSteps && (
              <ScrollView style={styles.stepsContainer} showsVerticalScrollIndicator={false}>
                {routeInfo.steps.map((step, index) => (
                  <View key={index} style={styles.stepItem}>
                    <View style={styles.stepIcon}>
                      <Ionicons
                        name={getManeuverIcon(step.maneuver || '')}
                        size={16}
                        color={colors.primary[500]}
                      />
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepInstruction}>{step.instruction}</Text>
                      {step.distance ? <Text style={styles.stepDistance}>{step.distance}</Text> : null}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
    minHeight: 250,
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.neutral[600],
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.neutral[600],
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary[500],
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  routePanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  routeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.neutral[200],
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  destinationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  destinationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationText: {
    flex: 1,
    marginLeft: 12,
  },
  destinationName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  destinationAddress: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 2,
  },
  startNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startNavText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
    marginRight: 4,
  },
  stepsContainer: {
    maxHeight: 180,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 13,
    color: colors.neutral[800],
    lineHeight: 18,
  },
  stepDistance: {
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 2,
  },
});

export default DirectionsMap;
