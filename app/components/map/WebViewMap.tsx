/**
 * WebView Map Component
 * Uses Google Maps embed via WebView (native) or iframe (web)
 */

import { colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Only import WebView on native platforms
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  availableChargers: number;
  totalChargers: number;
}

interface WebViewMapProps {
  stations: Station[];
  userLocation?: { latitude: number; longitude: number } | null;
  onMarkerPress?: (stationId: string) => void;
  style?: any;
}

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || 
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export function WebViewMap({ 
  stations, 
  userLocation, 
  onMarkerPress,
  style 
}: WebViewMapProps) {
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Default to Mumbai if no user location (for Indian app)
  const center = userLocation || { latitude: 19.0760, longitude: 72.8777 };

  // Handle messages from iframe on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data.type === 'markerPress' && onMarkerPress) {
            onMarkerPress(data.stationId);
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [onMarkerPress]);

  // Generate markers JavaScript
  const markersJS = stations.map(station => `
    new google.maps.Marker({
      position: { lat: ${station.latitude}, lng: ${station.longitude} },
      map: map,
      title: "${station.name}",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: "${station.availableChargers > 0 ? '#4CAF50' : '#9E9E9E'}",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 3,
      },
      label: {
        text: "⚡",
        fontSize: "14px",
      }
    }).addListener('click', function() {
      const msg = JSON.stringify({ type: 'markerPress', stationId: '${station.id}' });
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(msg);
      } else {
        window.parent.postMessage(msg, '*');
      }
    });
  `).join('\n');

  // User location marker
  const userMarkerJS = userLocation ? `
    new google.maps.Marker({
      position: { lat: ${userLocation.latitude}, lng: ${userLocation.longitude} },
      map: map,
      title: "You are here",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
      }
    });
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden; }
          #map { width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          function initMap() {
            const map = new google.maps.Map(document.getElementById('map'), {
              center: { lat: ${center.latitude}, lng: ${center.longitude} },
              zoom: 13,
              disableDefaultUI: true,
              zoomControl: true,
              styles: [
                { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
              ]
            });
            
            // Add station markers
            ${markersJS}
            
            // Add user location marker
            ${userMarkerJS}
          }
        </script>
        <script async defer 
          src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap">
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerPress' && onMarkerPress) {
        onMarkerPress(data.stationId);
      }
    } catch (e) {
      console.log('WebView message error:', e);
    }
  };

  if (error || !GOOGLE_MAPS_API_KEY) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Ionicons name="map-outline" size={48} color={colors.neutral[400]} />
        <Text style={styles.errorText}>
          {!GOOGLE_MAPS_API_KEY ? 'Google Maps API key not configured' : 'Failed to load map'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(false);
            setLoading(true);
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}
      
      {Platform.OS === 'web' ? (
        // Web: Use iframe
        <iframe
          srcDoc={html}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          onLoad={() => setLoading(false)}
          title="Map"
        />
      ) : WebView ? (
        // Native: Use WebView
        <WebView
          ref={webViewRef}
          source={{ html }}
          style={styles.webview}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          onMessage={handleMessage}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.neutral[200],
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.neutral[500],
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: colors.primary[500],
    borderRadius: 8,
  },
  retryText: {
    color: colors.white,
    fontWeight: '600',
  },
});
