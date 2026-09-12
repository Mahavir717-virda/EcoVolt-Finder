/**
 * WebView Map Component
 * Interactive map supporting Google Maps with automatic Leaflet/OpenStreetMap fallback
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
  availableChargers?: number;
  totalChargers?: number;
  available_chargers?: number;
  total_chargers?: number;
}

interface WebViewMapProps {
  stations: Station[];
  userLocation?: { latitude: number; longitude: number } | null;
  onMarkerPress?: (stationId: string) => void;
  style?: any;
}

const GOOGLE_MAPS_API_KEY =
  Constants.expoConfig?.extra?.googleMapsApiKey ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  '';

export function WebViewMap({
  stations,
  userLocation,
  onMarkerPress,
  style,
}: WebViewMapProps) {
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  // Leaflet is 100% reliable with zero API key / billing errors
  const [useLeaflet, setUseLeaflet] = useState(true);

  // Default to Ahmedabad Central EV Hub if no user location
  const center = userLocation || { latitude: 23.0370, longitude: 72.5622 };

  // Handle messages from iframe on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data.type === 'markerPress' && onMarkerPress) {
            onMarkerPress(data.stationId);
          }
        } catch {}
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [onMarkerPress]);

  // Leaflet HTML (100% reliable, zero API key required)
  const leafletHTML = `
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
          .custom-pin {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #10B981;
            color: #FFFFFF;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            border: 2px solid #FFFFFF;
          }
          .user-pin {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #3B82F6;
            box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.3);
            border: 2px solid #FFFFFF;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', { zoomControl: false }).setView([${center.latitude}, ${center.longitude}], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);

          const stationBounds = [];

          ${stations
            .map((s) => {
              const avail = s.availableChargers ?? s.available_chargers ?? 1;
              const bgColor = avail > 0 ? '#10B981' : '#64748B';
              return `
            (function() {
              const icon = L.divIcon({
                className: '',
                html: '<div class="custom-pin" style="background:${bgColor}">⚡</div>',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              });
              const marker = L.marker([${s.latitude}, ${s.longitude}], { icon: icon }).addTo(map);
              stationBounds.push([${s.latitude}, ${s.longitude}]);
              marker.on('click', function() {
                const msg = JSON.stringify({ type: 'markerPress', stationId: '${s.id}' });
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(msg);
                } else {
                  window.parent.postMessage(msg, '*');
                }
              });
            })();
          `;
            })
            .join('\n')}

          ${
            userLocation
              ? `
            (function() {
              const userIcon = L.divIcon({
                className: '',
                html: '<div class="user-pin"></div>',
                iconSize: [18, 18],
                iconAnchor: [9, 9]
              });
              L.marker([${userLocation.latitude}, ${userLocation.longitude}], { icon: userIcon }).addTo(map);
            })();
          `
              : ''
          }

          let userNear = false;
          ${
            userLocation
              ? `
            const uLat = ${userLocation.latitude};
            const uLng = ${userLocation.longitude};
            for (let i = 0; i < stationBounds.length; i++) {
              if (Math.abs(stationBounds[i][0] - uLat) < 1.5 && Math.abs(stationBounds[i][1] - uLng) < 1.5) {
                userNear = true;
                break;
              }
            }
          `
              : ''
          }

          const fitPoints = stationBounds.slice();
          ${
            userLocation
              ? `
            if (userNear || stationBounds.length === 0) {
              fitPoints.push([${userLocation.latitude}, ${userLocation.longitude}]);
            }
          `
              : ''
          }

          if (fitPoints.length > 1) {
            map.fitBounds(fitPoints, { padding: [40, 40], maxZoom: 15 });
          } else if (fitPoints.length === 1) {
            map.setView(fitPoints[0], 14);
          } else {
            map.setView([${center.latitude}, ${center.longitude}], 13);
          }
        </script>
      </body>
    </html>
  `;

  // Google Maps HTML with auto-fit bounds
  const googleMapsHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { width: 100%; height: 100%; background: #0F172A; }
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
              zoomControl: false,
            });

            const stationBounds = new google.maps.LatLngBounds();
            let count = 0;

            ${stations
              .map((s) => {
                const avail = s.availableChargers ?? s.available_chargers ?? 1;
                return `
              (function() {
                const pos = { lat: ${s.latitude}, lng: ${s.longitude} };
                stationBounds.extend(pos);
                count++;
                new google.maps.Marker({
                  position: pos,
                  map: map,
                  title: "${s.name}",
                  icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: "${avail > 0 ? '#10B981' : '#64748B'}",
                    fillOpacity: 1,
                    strokeColor: "#FFFFFF",
                    strokeWeight: 2,
                  },
                  label: { text: "⚡", fontSize: "14px", color: "#FFFFFF" }
                }).addListener('click', function() {
                  const msg = JSON.stringify({ type: 'markerPress', stationId: '${s.id}' });
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(msg);
                  } else {
                    window.parent.postMessage(msg, '*');
                  }
                });
              })();
            `;
              })
              .join('\n')}

            ${
              userLocation
                ? `
              (function() {
                const userPos = { lat: ${userLocation.latitude}, lng: ${userLocation.longitude} };
                new google.maps.Marker({
                  position: userPos,
                  map: map,
                  title: "Your Location",
                  icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: "#3B82F6",
                    fillOpacity: 1,
                    strokeColor: "#FFFFFF",
                    strokeWeight: 2,
                  }
                });

                let isNear = false;
                ${stations
                  .map(
                    (s) =>
                      `if (Math.abs(${s.latitude} - ${userLocation.latitude}) < 1.5 && Math.abs(${s.longitude} - ${userLocation.longitude}) < 1.5) isNear = true;`
                  )
                  .join('\n')}

                if (isNear || count === 0) {
                  stationBounds.extend(userPos);
                  count++;
                }
              })();
            `
                : ''
            }

            if (count > 1) {
              map.fitBounds(stationBounds);
            } else if (count === 1) {
              map.setCenter(stationBounds.getCenter());
              map.setZoom(14);
            }
          }
        </script>
        <script async defer
          src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap"
          onerror="window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapError' }))">
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerPress' && onMarkerPress) {
        onMarkerPress(data.stationId);
      } else if (data.type === 'mapError') {
        setUseLeaflet(true);
      }
    } catch {}
  };

  const currentHTML = useLeaflet || !GOOGLE_MAPS_API_KEY ? leafletHTML : googleMapsHTML;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        <iframe
          ref={iframeRef}
          srcDoc={currentHTML}
          style={styles.iframe as any}
          title="Charging Stations Map"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: currentHTML }}
        style={styles.webView}
        onMessage={handleMessage}
        onLoadEnd={() => setLoading(false)}
        onError={() => setUseLeaflet(true)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#0F172A',
  },
  webView: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  iframe: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
