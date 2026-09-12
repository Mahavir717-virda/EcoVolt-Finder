/**
 * Appearance Modal Screen
 * Theme modes (Dark / Light / System), EcoVolt Accent Colors, and Map Styling
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { spacing } from '@/styles/spacing';

export default function AppearanceModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedTheme, setSelectedTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [accentColor, setAccentColor] = useState('#10B981');
  const [mapStyle, setMapStyle] = useState<'eco' | 'minimal' | 'satellite'>('eco');
  const [highContrast, setHighContrast] = useState(false);

  const themeOptions = [
    { id: 'system', label: 'System Default', desc: 'Syncs automatically with device settings', icon: 'phone-portrait-outline' as const },
    { id: 'dark', label: 'Dark Onyx (Eco Battery)', desc: 'High energy efficiency on OLED screens', icon: 'moon-outline' as const },
    { id: 'light', label: 'Crisp Daylight', desc: 'Optimal contrast in bright outdoor sunlight', icon: 'sunny-outline' as const },
  ];

  const accents = [
    { label: 'Volt Emerald', color: '#10B981' },
    { label: 'Cyber Teal', color: '#0FB8C9' },
    { label: 'Solar Gold', color: '#F59E0B' },
    { label: 'Electric Indigo', color: '#6366F1' },
  ];

  const handleApply = () => {
    Alert.alert(
      'Appearance Saved',
      `Theme set to ${selectedTheme.toUpperCase()} with ${accents.find(a => a.color === accentColor)?.label} accent.`,
      [{ text: 'Done', onPress: () => router.back() }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="close" size={26} color={colors.neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appearance & Theme</Text>
        <TouchableOpacity onPress={handleApply} style={styles.applyHeaderBtn}>
          <Text style={styles.applyHeaderText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Mode Selector */}
        <Text style={styles.sectionTitle}>Theme Mode</Text>
        <View style={styles.card}>
          {themeOptions.map((opt, idx) => {
            const isSelected = selectedTheme === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.themeRow, idx < themeOptions.length - 1 && styles.rowBorder]}
                onPress={() => setSelectedTheme(opt.id as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.themeIconBox, isSelected && { backgroundColor: accentColor + '20' }]}>
                  <Ionicons name={opt.icon} size={22} color={isSelected ? accentColor : colors.neutral[600]} />
                </View>
                <View style={styles.themeInfo}>
                  <Text style={styles.themeLabel}>{opt.label}</Text>
                  <Text style={styles.themeDesc}>{opt.desc}</Text>
                </View>
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={isSelected ? accentColor : colors.neutral[300]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Accent Color Picker */}
        <Text style={styles.sectionTitle}>Eco Accent Palette</Text>
        <View style={styles.accentGrid}>
          {accents.map((acc) => {
            const isSelected = accentColor === acc.color;
            return (
              <TouchableOpacity
                key={acc.color}
                style={[
                  styles.accentBox,
                  isSelected && { borderColor: acc.color, borderWidth: 2, backgroundColor: acc.color + '15' },
                ]}
                onPress={() => setAccentColor(acc.color)}
                activeOpacity={0.8}
              >
                <View style={[styles.colorCircle, { backgroundColor: acc.color }]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color={colors.white} />}
                </View>
                <Text style={[styles.accentLabel, isSelected && { color: acc.color, fontWeight: '700' }]}>
                  {acc.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Map Styles */}
        <Text style={styles.sectionTitle}>Live Charging Map Style</Text>
        <View style={styles.card}>
          {[
            { id: 'eco', title: 'Eco Hybrid Grid', desc: 'Highlights renewable zones & solar charging clusters' },
            { id: 'minimal', title: 'Minimalist Clean', desc: 'Low distractions, fast rendering' },
            { id: 'satellite', title: '3D Satellite Terrain', desc: 'High-definition satellite overhead view' },
          ].map((styleOpt, idx) => {
            const isSelected = mapStyle === styleOpt.id;
            return (
              <TouchableOpacity
                key={styleOpt.id}
                style={[styles.themeRow, idx < 2 && styles.rowBorder]}
                onPress={() => setMapStyle(styleOpt.id as any)}
                activeOpacity={0.7}
              >
                <View style={styles.themeInfo}>
                  <Text style={styles.themeLabel}>{styleOpt.title}</Text>
                  <Text style={styles.themeDesc}>{styleOpt.desc}</Text>
                </View>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={isSelected ? accentColor : colors.neutral[300]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* High Contrast Accessibility Toggle */}
        <TouchableOpacity
          style={styles.contrastCard}
          onPress={() => setHighContrast(!highContrast)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.contrastTitle}>High Contrast Live Grid</Text>
            <Text style={styles.contrastDesc}>
              Enhances readability of dynamic greenness bands and tariff charts
            </Text>
          </View>
          <Ionicons
            name={highContrast ? 'toggle' : 'toggle-outline'}
            size={34}
            color={highContrast ? accentColor : colors.neutral[400]}
          />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  applyHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primary[50],
  },
  applyHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary[600],
  },
  scrollContent: {
    padding: spacing.screenPadding,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  themeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  themeInfo: {
    flex: 1,
  },
  themeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  themeDesc: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
  },
  accentBox: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    gap: 8,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  contrastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginTop: 4,
  },
  contrastTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  contrastDesc: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
});
