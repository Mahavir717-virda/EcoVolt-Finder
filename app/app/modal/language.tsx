/**
 * Language Selection Modal Screen
 * Multi-language support for EcoVolt drivers (English, Hindi, Gujarati, Marathi, Tamil)
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

export default function LanguageModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedLang, setSelectedLang] = useState('en');

  const languages = [
    { id: 'en', name: 'English', nativeName: 'English (India)', region: 'Default' },
    { id: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'National' },
    { id: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'Western Zone (IN-WE)' },
    { id: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'Western Zone (IN-WE)' },
    { id: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'Southern Zone (IN-SO)' },
    { id: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'Southern Zone (IN-SO)' },
  ];

  const handleSelect = (id: string, name: string) => {
    setSelectedLang(id);
    Alert.alert(
      'Language Updated',
      `App language set to ${name}. Changes applied immediately.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="close" size={26} color={colors.neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Language</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionSubtitle}>
          Choose your preferred interface and tariff announcement language
        </Text>

        <View style={styles.card}>
          {languages.map((lang, index) => {
            const isSelected = selectedLang === lang.id;
            return (
              <TouchableOpacity
                key={lang.id}
                style={[
                  styles.langItem,
                  index < languages.length - 1 && styles.itemBorder,
                ]}
                onPress={() => handleSelect(lang.id, lang.name)}
                activeOpacity={0.7}
              >
                <View style={styles.langInfo}>
                  <Text style={styles.nativeName}>{lang.nativeName}</Text>
                  <Text style={styles.langRegion}>{lang.name} · {lang.region}</Text>
                </View>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={isSelected ? colors.primary[500] : colors.neutral[300]}
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
  scrollContent: {
    padding: spacing.screenPadding,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: spacing.md,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
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
    borderBottomColor: colors.neutral[100],
  },
  langInfo: {
    flex: 1,
  },
  nativeName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  langRegion: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
});
