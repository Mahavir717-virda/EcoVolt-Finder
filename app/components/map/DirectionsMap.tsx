/**
 * DirectionsMap Component
 * In-app Google Maps directions with turn-by-turn navigation
 */

import { colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || 
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

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
        } catch (e) {
          // Ignore non-JSON messages
        }
      };
      window.addEventListener('message', handleWindowMessage);
      return () => window.removeEventListener('message', handleWindowMessage);
    }
  }, []);

  // Get user's current location with instant last-known and timeout fallback
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Try last known first for instant rendering
          try {
            const lastKnown = await Location.getLastKnownPositionAsync();
            if (lastKnown?.coords) {
              setUserLocation({
                latitude: lastKnown.coords.latitude,
                longitude: lastKnown.coords.longitude,
              });
            }
          } catch {}

          // Race current position with a 4.5s timeout
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500));
          const posPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const result = await Promise.race([posPromise, timeoutPromise]);

          if (result && result.coords) {
            setUserLocation({
              latitude: result.coords.latitude,
              longitude: result.coords.longitude,
            });
            return;
          }
        }
        
        // Fallback default: Navrangpura Ahmedabad EV Hub if no location acquired
        setUserLocation((prev) => prev || { latitude: 23.0370, longitude: 72.5622 });
      } catch (err) {
        console.warn('DirectionsMap location error, using fallback hub:', err);
        setUserLocation((prev) => prev || { latitude: 23.0370, longitude: 72.5622 });
      }
    })();
  }, []);

  // Generate map HTML with directions
  const mapHtml = useCallback(() => {
    if (!userLocation) return '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let map, directionsService, directionsRenderer;
    
    function initMap() {
      const origin = { lat: ${userLocation.latitude}, lng: ${userLocation.longitude} };
      const destination = { lat: ${destination.latitude}, lng: ${destination.longitude} };
      
      // Helper to send messages to parent
      function sendMessage(data) {
        const msg = JSON.stringify(data);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(msg);
        } else {
          window.parent.postMessage(msg, '*');
        }
      }
      
      map = new google.maps.Map(document.getElementById('map'), {
        zoom: 14,
        center: origin,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_CENTER
        }
      });
      
      directionsService = new google.maps.DirectionsService();
      directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#4CAF50',
          strokeWeight: 5,
          strokeOpacity: 0.8
        }
      });
      
      // Calculate and display route
      directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING
      }, (response, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(response);
          
          // Send route info to parent
          const leg = response.routes[0].legs[0];
          sendMessage({
            type: 'routeInfo',
            distance: leg.distance.text,
            duration: leg.duration.text,
            steps: leg.steps.map(s => ({
              instruction: s.instructions.replace(/<[^>]*>/g, ''),
              distance: s.distance.text,
              maneuver: s.maneuver || ''
            }))
          });
        } else {
          sendMessage({
            type: 'error',
            message: 'Could not calculate route: ' + status
          });
        }
      });
    }
  </script>
  <script async defer 
    src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap">
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
    } catch (e) {
      console.log('WebView message error:', e);
    }
  }, []);

  // Get icon for maneuver type
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

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Ionicons name="map-outline" size={48} color={colors.neutral[400]} />
        <Text style={styles.errorText}>Google Maps API key not configured</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Ionicons name="alert-circle" size={48} color={colors.error[500]} />
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
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Map */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <iframe
            ref={webViewRef}
            srcDoc={mapHtml()}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
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
      {routeInfo && (
        <View style={styles.routePanel}>
          {/* Summary */}
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

          {/* Destination */}
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

          {/* Toggle Directions */}
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

          {/* Turn-by-Turn Steps */}
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
                    <Text style={styles.stepDistance}>{step.distance}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
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
    backgroundColor: 'rgba(255,255,255,0.8)',
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
    paddingBottom: 8,
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
    paddingVertical: 16,
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
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
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
    maxHeight: 200,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 14,
    color: colors.neutral[800],
    lineHeight: 20,
  },
  stepDistance: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 4,
  },
});

export default DirectionsMap;
