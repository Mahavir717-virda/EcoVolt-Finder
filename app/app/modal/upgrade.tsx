import { Button, Card } from '@/components/ui';
import { colors } from '@/constants/colors';
import { PLANS } from '@/constants/plans';
import { useAuth } from '@/hooks/useAuth';
import { updatePlanType } from '@/services/users.service';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function UpgradeModal() {
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const premiumPlan = PLANS.premium;
  const freePlan = PLANS.free;

  const handleUpgrade = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to upgrade');
      return;
    }

    setLoading(true);
    try {
      // Update user's plan to premium
      await updatePlanType(user.id, 'premium');
      
      // Refresh the profile to update the UI
      await refreshProfile();
      
      // Show success message
      Alert.alert(
        '🎉 Welcome to Premium!',
        'You now have access to unlimited reservations and all premium features.',
        [
          {
            text: 'Awesome!',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Upgrade error:', error);
      Alert.alert('Error', 'Failed to upgrade. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="flash" size={40} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.subtitle}>
            Get unlimited reservations and exclusive features
          </Text>
        </View>

        {/* Comparison */}
        <View style={styles.comparison}>
          {/* Free Plan */}
          <Card style={styles.planCard}>
            <Text style={styles.planName}>{freePlan.name}</Text>
            <Text style={styles.planPrice}>₹0</Text>
            <Text style={styles.planPeriod}>Forever Free</Text>
            
            <View style={styles.features}>
              {freePlan.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Ionicons 
                    name={feature.included ? 'checkmark-circle' : 'close-circle'} 
                    size={20} 
                    color={feature.included ? colors.status.success : colors.neutral[400]} 
                  />
                  <Text style={[
                    styles.featureText,
                    !feature.included && styles.featureTextDisabled
                  ]}>
                    {feature.name}
                    {feature.limit && ` (${feature.limit})`}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Premium Plan */}
          <Card style={[styles.planCard, styles.premiumCard]}>
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>RECOMMENDED</Text>
            </View>
            
            <Text style={[styles.planName, styles.premiumText]}>{premiumPlan.name}</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.planPrice, styles.premiumPrice]}>
                ₹{premiumPlan.monthlyPrice}
              </Text>
              <Text style={styles.priceUnit}>/month</Text>
            </View>
            <Text style={[styles.planPeriod, styles.premiumPeriod]}>
              or ₹{premiumPlan.yearlyPrice}/year (Save ₹389)
            </Text>
            
            <View style={styles.features}>
              {premiumPlan.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={colors.primary[400]} 
                  />
                  <Text style={[styles.featureText, styles.premiumFeatureText]}>
                    {feature.name}
                    {feature.limit === 'unlimited' && ' ✨'}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* Premium Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Why Go Premium?</Text>
          
          <View style={styles.benefitItem}>
            <View style={styles.benefitIcon}>
              <Ionicons name="calendar" size={24} color={colors.primary[500]} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Unlimited Reservations</Text>
              <Text style={styles.benefitDesc}>
                Reserve chargers anytime, anywhere. No daily limits.
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.benefitIcon}>
              <Ionicons name="notifications" size={24} color={colors.primary[500]} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Priority Notifications</Text>
              <Text style={styles.benefitDesc}>
                Get notified first when your favorite chargers become available.
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.benefitIcon}>
              <Ionicons name="star" size={24} color={colors.primary[500]} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Extended Reservations</Text>
              <Text style={styles.benefitDesc}>
                Book chargers up to 2 hours in advance instead of 30 minutes.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          variant="primary"
          size="lg"
          onPress={handleUpgrade}
          title={loading ? 'Upgrading...' : `Upgrade to Premium - ₹${premiumPlan.monthlyPrice}/mo`}
          fullWidth
          loading={loading}
          disabled={loading}
        />
        
        <Button
          variant="ghost"
          size="md"
          onPress={handleSkip}
          style={styles.skipButton}
          title="Maybe Later"
          disabled={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 180,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
  },
  comparison: {
    gap: 16,
    marginBottom: 32,
  },
  planCard: {
    padding: 20,
  },
  premiumCard: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
    position: 'relative',
    overflow: 'hidden',
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: -28,
    backgroundColor: colors.status.warning,
    paddingHorizontal: 32,
    paddingVertical: 4,
    transform: [{ rotate: '45deg' }],
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 4,
  },
  premiumText: {
    color: colors.white,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  premiumPrice: {
    color: colors.white,
  },
  priceUnit: {
    fontSize: 16,
    color: colors.primary[200],
    marginLeft: 4,
  },
  planPeriod: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 16,
  },
  premiumPeriod: {
    color: colors.primary[200],
  },
  features: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: colors.neutral[700],
    flex: 1,
  },
  featureTextDisabled: {
    color: colors.neutral[400],
  },
  premiumFeatureText: {
    color: colors.white,
  },
  benefitsSection: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 13,
    color: colors.neutral[500],
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  skipButton: {
    marginTop: 8,
  },
});
