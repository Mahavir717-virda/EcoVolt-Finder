import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text, Button, Card, Chip } from '../../components';

const { width } = Dimensions.get('window');

interface IntroSlide {
  badge: string;
  badgeColor: string;
  title: string;
  highlight: string;
  description: string;
}

const slides: IntroSlide[] = [
  {
    badge: 'Real-Time Visibility',
    badgeColor: colors.brand,
    title: 'See the Grid.',
    highlight: 'Charge Clean.',
    description:
      'We reveal the live renewable percentage (solar + wind + hydro) and carbon intensity of every station so you can make informed charging decisions.',
  },
  {
    badge: 'Smart Incentive Loop',
    badgeColor: colors.volt,
    title: 'Cut Costs &',
    highlight: 'CO₂ Emissions.',
    description:
      'Get dynamic green-window discounts. Charging when renewable supply peaks saves up to 40% on tariff costs while reducing fossil grid reliance.',
  },
  {
    badge: 'Autonomous Scheduler',
    badgeColor: colors.brand,
    title: 'Plug In Anytime.',
    highlight: 'We Time It For You.',
    description:
      'Never babysit a charger. Our smart-charge optimizer locks the lowest tariff and automatically executes delayed charging during peak renewable hours.',
  },
];

export const IntroScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Intro'>>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigation.navigate('RoleSelect');
    }
  };

  const slide = slides[currentSlide];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <Text variant="h2" style={styles.logoText}>
            ecoVolt<Text variant="h2" color={colors.brand}>-finder</Text>
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Login')}
            style={styles.skipBtn}
          >
            <Text variant="caption" color={colors.ink2}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>

        {/* Slide Content Card */}
        <View style={styles.slideArea}>
          <Card elevation="e1" padding="lg" style={styles.slideCard}>
            <Chip
              label={slide.badge}
              variant="subtle"
              dotColor={slide.badgeColor}
              color={slide.badgeColor}
              backgroundColor={`${slide.badgeColor}18`}
            />

            <View style={styles.textContainer}>
              <Text variant="display" style={styles.slideTitle}>
                {slide.title}{'\n'}
                <Text variant="display" color={slide.badgeColor}>
                  {slide.highlight}
                </Text>
              </Text>

              <Text variant="body" color={colors.ink2} style={styles.description}>
                {slide.description}
              </Text>
            </View>
          </Card>
        </View>

        {/* Step Indicator */}
        <View style={styles.indicatorRow}>
          {slides.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setCurrentSlide(index)}
              style={[
                styles.indicatorDot,
                index === currentSlide && styles.indicatorDotActive,
              ]}
            />
          ))}
        </View>

        {/* Action Controls */}
        <View style={styles.actionContainer}>
          <Button
            label={currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
            variant="primary"
            onPress={handleNext}
          />
          <Button
            label="Already have an account? Sign In"
            variant="ghost"
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    justifyContent: 'space-between',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
  },
  logoText: {
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  skipBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  slideArea: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: spacing.base,
  },
  slideCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    gap: spacing.base,
  },
  textContainer: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  slideTitle: {
    lineHeight: 42,
  },
  description: {
    lineHeight: 24,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.line,
  },
  indicatorDotActive: {
    width: 24,
    backgroundColor: colors.brand,
  },
  actionContainer: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
});
