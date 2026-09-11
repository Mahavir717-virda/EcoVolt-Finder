import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme/tokens';
import { useAuthStore, Role } from '../../features/auth/authStore';
import { http } from '../../api/http';
import { ENV } from '../../api/config';
import { Spinner } from '../../components/feedback/Spinner';

interface PlaceholderScreenProps {
  title: string;
  subtitle?: string;
  roleContext?: Role;
}

export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({
  title,
  subtitle,
  roleContext,
}) => {
  const { user, role, isAuthenticated, setAuth, logout, setRole } = useAuthStore();
  const [demoData, setDemoData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDemoFetch = async () => {
    setLoading(true);
    try {
      const data = await http.get<Record<string, unknown>>('/grid/live');
      setDemoData(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setDemoData(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMockLogin = async (targetRole: Role) => {
    await setAuth(
      {
        id: `usr_${targetRole}_101`,
        email: `${targetRole}@ecovolt.app`,
        name: `Deep (${targetRole})`,
        role: targetRole,
      },
      `mock_token_${targetRole}`
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>M1-C1 Bootstrap</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Environment & State</Text>
        <Text style={styles.infoText}>• USE_MOCKS: <Text style={styles.bold}>{ENV.USE_MOCKS ? 'true (contracts/examples)' : 'false (live API)'}</Text></Text>
        <Text style={styles.infoText}>• API Base: <Text style={styles.bold}>{ENV.API_BASE_URL}</Text></Text>
        <Text style={styles.infoText}>• Auth State: <Text style={styles.bold}>{isAuthenticated ? `Logged in as ${user?.name} (${role})` : 'Not authenticated'}</Text></Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Role Switching (Dev Check)</Text>
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, role === 'driver' && styles.btnActive]}
            onPress={() => handleMockLogin('driver')}
          >
            <Text style={[styles.btnText, role === 'driver' && styles.btnTextActive]}>Driver</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, role === 'manager' && styles.btnActive]}
            onPress={() => handleMockLogin('manager')}
          >
            <Text style={[styles.btnText, role === 'manager' && styles.btnTextActive]}>Manager</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, role === 'admin' && styles.btnActive]}
            onPress={() => handleMockLogin('admin')}
          >
            <Text style={[styles.btnText, role === 'admin' && styles.btnTextActive]}>Admin</Text>
          </TouchableOpacity>
        </View>

        {isAuthenticated && (
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutBtnText}>Log Out (Auth Stack)</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>HTTP & Mock Verification</Text>
        <TouchableOpacity style={styles.fetchBtn} onPress={handleDemoFetch} disabled={loading}>
          {loading ? (
            <Spinner color="#FFFFFF" />
          ) : (
            <Text style={styles.fetchBtnText}>Fetch Live Grid (/grid/live)</Text>
          )}
        </TouchableOpacity>

        {demoData && (
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{demoData}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
    gap: spacing.base,
  },
  headerCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    ...shadows.e1,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandTint,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
  },
  badgeText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  subtitle: {
    fontSize: 14,
    color: colors.ink2,
    fontFamily: 'Manrope_500Medium',
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.md,
    ...shadows.e1,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: colors.ink2,
    fontFamily: 'Manrope_400Regular',
  },
  bold: {
    fontWeight: '700',
    color: colors.ink,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  btnActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    fontFamily: 'Manrope_600SemiBold',
  },
  btnTextActive: {
    color: '#FFFFFF',
  },
  logoutBtn: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.sm,
  },
  logoutBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  fetchBtn: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  fetchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  codeBox: {
    backgroundColor: colors.grid900,
    padding: spacing.md,
    borderRadius: radii.sm,
    marginTop: spacing.xs,
  },
  codeText: {
    color: colors.volt,
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
  },
});
