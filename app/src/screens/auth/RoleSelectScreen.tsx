import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { Role, useAuthStore } from '../../features/auth/authStore';
import { colors, radii, shadows, spacing } from '../../theme/tokens';
import { Text, Button, Card, Chip } from '../../components';

interface RoleOption {
  id: Role;
  title: string;
  badge: string;
  badgeColor: string;
  tagline: string;
  bullets: string[];
}

const roleOptions: RoleOption[] = [
  {
    id: 'driver',
    title: 'EV Driver',
    badge: 'Smart Charging',
    badgeColor: colors.brand,
    tagline: 'Optimize charging costs & carbon footprint',
    bullets: [
      'Live greenness score & ratings per charging hub',
      'True-cost recommendations (travel + energy total)',
      'Autonomous smart-charging schedule execution',
    ],
  },
  {
    id: 'manager',
    title: 'Station Manager',
    badge: 'Network Operator',
    badgeColor: colors.volt,
    tagline: 'Manage station tariffs & demand-charge exposure',
    bullets: [
      'Multi-provider base tariff + custom margin markups',
      'Dynamic ToU greenness discount controls',
      'Live station occupancy & demand-charge risk gauge',
    ],
  },
  {
    id: 'admin',
    title: 'Grid Operator / Admin',
    badge: 'System Oversight',
    badgeColor: colors.warning,
    tagline: 'Regional energy mix & renewable peak smoothing',
    bullets: [
      'Regional grid carbon intensity & load monitoring',
      'Renewable load-shifting analytics & impact metrics',
      'Zone-level diagnostics & data quality assurance',
    ],
  },
];

export const RoleSelectScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'RoleSelect'>>();
  const { setRole } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<Role>('driver');

  const handleSelect = (role: Role) => {
    setSelectedRole(role);
    setRole(role);
  };

  const handleContinueSignup = () => {
    navigation.navigate('Signup', { role: selectedRole });
  };

  const handleContinueLogin = () => {
    navigation.navigate('Login', { role: selectedRole });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="h1" style={styles.title}>
            Choose Your Profile
          </Text>
          <Text variant="body" color={colors.ink2}>
            Select how you interact with the clean energy grid to customize your tools.
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.rolesList}>
          {roleOptions.map((opt) => {
            const isSelected = selectedRole === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.85}
                onPress={() => handleSelect(opt.id)}
              >
                <Card
                  elevation={isSelected ? 'e2' : 'e0'}
                  padding="md"
                  style={isSelected ? [styles.roleCard, styles.selectedCard] : styles.roleCard}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text variant="title" style={styles.roleTitle}>
                        {opt.title}
                      </Text>
                      <Text variant="caption" color={colors.ink2}>
                        {opt.tagline}
                      </Text>
                    </View>
                    <Chip
                      label={opt.badge}
                      variant="subtle"
                      dotColor={opt.badgeColor}
                      color={opt.badgeColor}
                      backgroundColor={`${opt.badgeColor}18`}
                    />
                  </View>

                  <View style={styles.bulletList}>
                    {opt.bullets.map((b, idx) => (
                      <View key={idx} style={styles.bulletRow}>
                        <View style={[styles.bulletDot, { backgroundColor: isSelected ? colors.brand : colors.ink3 }]} />
                        <Text variant="caption" color={colors.ink} style={styles.bulletText}>
                          {b}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            label={`Continue as ${selectedRole === 'driver' ? 'Driver' : selectedRole === 'manager' ? 'Station Manager' : 'Grid Admin'}`}
            variant="primary"
            onPress={handleContinueSignup}
          />
          <Button
            label="Already registered? Sign In"
            variant="ghost"
            onPress={handleContinueLogin}
          />
        </View>
      </ScrollView>
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
  },
  content: {
    padding: spacing.base,
    gap: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  rolesList: {
    gap: spacing.md,
  },
  roleCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    gap: spacing.md,
  },
  selectedCard: {
    borderColor: colors.brand,
    borderWidth: 2,
    backgroundColor: '#FAFDFB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  roleTitle: {
    fontSize: 18,
  },
  bulletList: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bulletText: {
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
