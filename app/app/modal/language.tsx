/**
 * Language Selection Modal Screen
 * Supports English and Hindi (हिन्दी) with instant whole-app translation.
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
import { useLanguage, LanguageCode } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';

export default function LanguageModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();
  const { colors } = useTheme();

  const supportedLanguages: { id: LanguageCode; name: string; nativeName: string; region: string }[] = [
    {
      id: 'en',
      name: 'English',
      nativeName: 'English (India)',
      region: 'National Default',
    },
    {
      id: 'hi',
      name: 'Hindi',
      nativeName: 'हिन्दी (Hindi)',
      region: 'राष्ट्रीय भाषा (National)',
    },
  ];

  const handleSelect = async (id: LanguageCode, name: string) => {
    await setLanguage(id);
    Alert.alert(
      t('lang.saved_title', 'Language Updated'),
      id === 'hi'
        ? 'ऐप की भाषा सफलतापूर्वक हिन्दी में बदल दी गई है।'
        : 'App language successfully set to English.',
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
          {t('lang.title', 'Select Language')}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          {t('lang.subtitle', 'Choose your preferred interface and tariff announcement language')}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {supportedLanguages.map((lang, index) => {
            const isSelected = language === lang.id;
            return (
              <TouchableOpacity
                key={lang.id}
                style={[
                  styles.langItem,
                  index < supportedLanguages.length - 1 && [styles.itemBorder, { borderBottomColor: colors.borderLight }],
                  isSelected && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => handleSelect(lang.id, lang.name)}
                activeOpacity={0.7}
              >
                <View style={styles.langInfo}>
                  <Text style={[styles.nativeName, { color: colors.textPrimary }]}>
                    {lang.nativeName}
                  </Text>
                  <Text style={[styles.langRegion, { color: colors.textSecondary }]}>
                    {lang.name} · {lang.region}
                  </Text>
                </View>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>
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
  scrollContent: {
    padding: spacing.screenPadding,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: spacing.md,
    marginLeft: 4,
    lineHeight: 18,
  },
  card: {
    borderRadius: spacing.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  itemBorder: {
    borderBottomWidth: 1,
  },
  langInfo: {
    flex: 1,
  },
  nativeName: {
    fontSize: 16,
    fontWeight: '700',
  },
  langRegion: {
    fontSize: 12,
    marginTop: 2,
  },
});
