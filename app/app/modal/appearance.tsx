/**
 * Appearance Modal Screen
 * Theme modes (Dark / Light / System), EcoVolt Accent Colors, and Map Styling
 * Connected to global dynamic ThemeProvider and LanguageProvider.
 */

import React from 'react';
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
import { spacing } from '@/styles/spacing';
import { useTheme, ThemeMode, MapStylePreference } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';

export default function AppearanceModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const {
    themeMode,
    accentColor,
    mapStyle,
    highContrast,
    colors,
    setThemeMode,
    setAccentColor,
    setMapStyle,
    setHighContrast,
  } = useTheme();

  const themeOptions: { id: ThemeMode; labelKey: string; defaultLabel: string; descKey: string; defaultDesc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    {
      id: 'system',
      labelKey: 'appearance.system_default',
      defaultLabel: 'System Default',
      descKey: 'appearance.system_desc',
      defaultDesc: 'Syncs automatically with device settings',
      icon: 'phone-portrait-outline',
    },
    {
      id: 'dark',
      labelKey: 'appearance.dark_onyx',
      defaultLabel: 'Dark Onyx (Eco Battery)',
      descKey: 'appearance.dark_desc',
      defaultDesc: 'High energy efficiency on OLED screens',
      icon: 'moon-outline',
    },
    {
      id: 'light',
      labelKey: 'appearance.crisp_light',
      defaultLabel: 'Crisp Daylight',
      descKey: 'appearance.light_desc',
      defaultDesc: 'Optimal contrast in bright outdoor sunlight',
      icon: 'sunny-outline',
    },
  ];

  const accents = [
    { labelKey: 'appearance.volt_emerald', defaultLabel: 'Volt Emerald', color: '#10B981' },
    { labelKey: 'appearance.cyber_teal', defaultLabel: 'Cyber Teal', color: '#0FB8C9' },
    { labelKey: 'appearance.solar_gold', defaultLabel: 'Solar Gold', color: '#F59E0B' },
    { labelKey: 'appearance.electric_indigo', defaultLabel: 'Electric Indigo', color: '#6366F1' },
  ];

  const mapOptions: { id: MapStylePreference; titleKey: string; defaultTitle: string; descKey: string; defaultDesc: string }[] = [
    {
      id: 'eco',
      titleKey: 'appearance.eco_hybrid',
      defaultTitle: 'Eco Hybrid Grid',
      descKey: 'appearance.eco_hybrid_desc',
      defaultDesc: 'Highlights renewable zones & solar charging clusters',
    },
    {
      id: 'minimal',
      titleKey: 'appearance.minimal',
      defaultTitle: 'Minimalist Clean',
      descKey: 'appearance.minimal_desc',
      defaultDesc: 'Low distractions, fast rendering',
    },
    {
      id: 'satellite',
      titleKey: 'appearance.satellite',
      defaultTitle: '3D Satellite Terrain',
      descKey: 'appearance.satellite_desc',
      defaultDesc: 'High-definition satellite overhead view',
    },
  ];

  const handleApply = () => {
    Alert.alert(
      t('appearance.title', 'Appearance & Theme'),
      t('appearance.theme_mode', 'Theme Mode') + ': ' + themeMode.toUpperCase(),
      [{ text: t('common.ok', 'OK'), onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('appearance.title', 'Appearance & Theme')}
        </Text>
        <TouchableOpacity
          onPress={handleApply}
          style={[styles.applyHeaderBtn, { backgroundColor: colors.primaryLight }]}
        >
          <Text style={[styles.applyHeaderText, { color: colors.primary }]}>
            {t('appearance.done', 'Done')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Mode Selector */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t('appearance.theme_mode', 'Theme Mode')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {themeOptions.map((opt, idx) => {
            const isSelected = themeMode === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.themeRow,
                  idx < themeOptions.length - 1 && [styles.rowBorder, { borderBottomColor: colors.borderLight }],
                  isSelected && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => setThemeMode(opt.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.themeIconBox,
                    { backgroundColor: isSelected ? colors.primaryLight : colors.borderLight },
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={22}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={styles.themeInfo}>
                  <Text style={[styles.themeLabel, { color: colors.textPrimary }]}>
                    {t(opt.labelKey, opt.defaultLabel)}
                  </Text>
                  <Text style={[styles.themeDesc, { color: colors.textSecondary }]}>
                    {t(opt.descKey, opt.defaultDesc)}
                  </Text>
                </View>
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Accent Color Picker */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t('appearance.eco_accent', 'Eco Accent Palette')}
        </Text>
        <View style={styles.accentGrid}>
          {accents.map((acc) => {
            const isSelected = accentColor === acc.color;
            return (
              <TouchableOpacity
                key={acc.color}
                style={[
                  styles.accentBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isSelected ? acc.color : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => setAccentColor(acc.color)}
                activeOpacity={0.8}
              >
                <View style={[styles.colorCircle, { backgroundColor: acc.color }]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text
                  style={[
                    styles.accentLabel,
                    { color: isSelected ? acc.color : colors.textPrimary },
                    isSelected && { fontWeight: '700' },
                  ]}
                >
                  {t(acc.labelKey, acc.defaultLabel)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Map Styles */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t('appearance.map_style', 'Live Charging Map Style')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {mapOptions.map((styleOpt, idx) => {
            const isSelected = mapStyle === styleOpt.id;
            return (
              <TouchableOpacity
                key={styleOpt.id}
                style={[
                  styles.themeRow,
                  idx < mapOptions.length - 1 && [styles.rowBorder, { borderBottomColor: colors.borderLight }],
                  isSelected && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => setMapStyle(styleOpt.id)}
                activeOpacity={0.7}
              >
                <View style={styles.themeInfo}>
                  <Text style={[styles.themeLabel, { color: colors.textPrimary }]}>
                    {t(styleOpt.titleKey, styleOpt.defaultTitle)}
                  </Text>
                  <Text style={[styles.themeDesc, { color: colors.textSecondary }]}>
                    {t(styleOpt.descKey, styleOpt.defaultDesc)}
                  </Text>
                </View>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* High Contrast Accessibility Toggle */}
        <TouchableOpacity
          style={[styles.contrastCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setHighContrast(!highContrast)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.contrastTitle, { color: colors.textPrimary }]}>
              {t('appearance.high_contrast', 'High Contrast Live Grid')}
            </Text>
            <Text style={[styles.contrastDesc, { color: colors.textSecondary }]}>
              {t('appearance.contrast_desc', 'Enhances readability of dynamic greenness bands and tariff charts')}
            </Text>
          </View>
          <Ionicons
            name={highContrast ? 'toggle' : 'toggle-outline'}
            size={34}
            color={highContrast ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  applyHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  applyHeaderText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.screenPadding,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 12,
    marginLeft: 4,
  },
  card: {
    borderRadius: spacing.radius.lg,
    borderWidth: 1,
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
  },
  themeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
  },
  themeDesc: {
    fontSize: 12,
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
    borderRadius: spacing.radius.lg,
    padding: 12,
    alignItems: 'center',
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
  },
  contrastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginTop: 4,
  },
  contrastTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  contrastDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
