import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { DriverStackParamList } from '../../navigation/types';
import { http } from '../../api/http';
import { DriverImpact, Vehicle } from '@contracts/types';
import { useAuthStore } from '../../features/auth/authStore';
import {
  useVehiclesStore,
  VehicleCard,
  VehicleFormModal,
  VehicleFormData,
} from '../../features/vehicles';
import {
  Text,
  Button,
  Chip,
  Card,
  EmptyState,
  SkeletonCard,
} from '../../components';
import { colors, radii, shadows, spacing } from '../../theme/tokens';

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();
  const { user, logout } = useAuthStore();

  // Vehicles store
  const {
    vehicles,
    activeVehicleId,
    hydrate: hydrateVehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    setActiveVehicle,
  } = useVehiclesStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    hydrateVehicles();
  }, [hydrateVehicles]);

  // Fetch Driver Impact Stats
  const impactQuery = useQuery<DriverImpact>({
    queryKey: ['driver', 'impact'],
    queryFn: async () => {
      const res = await http.get<DriverImpact>('/impact/me');
      return res;
    },
    staleTime: 30000,
  });

  const impact = impactQuery.data || {
    userId: user?.id || 'usr_driver_101',
    totalSessions: 14,
    totalKwh: 284.5,
    totalSpent: 1764.0,
    savedVsSticker: 342.0,
    co2AvoidedKg: 118.4,
    avgRenewablePct: 78.2,
  };

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleDelete = (vehicle: Vehicle) => {
    if (vehicles.length <= 1) {
      Alert.alert(
        'Cannot Delete',
        'You must have at least one EV in your garage to calculate range and travel costs.'
      );
      return;
    }

    Alert.alert(
      'Remove Vehicle',
      `Are you sure you want to remove ${vehicle.model || 'this vehicle'} from your garage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteVehicle(vehicle.id),
        },
      ]
    );
  };

  const handleSaveVehicle = async (data: VehicleFormData) => {
    if (editingVehicle) {
      await updateVehicle(editingVehicle.id, data);
    } else {
      await addVehicle(data);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + 100 
          },
        ]}
      >
        {/* 1. Driver Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text variant="sectionLabel" color="#FFFFFF" style={styles.avatarLetter}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'D'}
            </Text>
          </View>

          <View style={styles.driverMetaCol}>
            <View style={styles.nameRow}>
              <Text variant="cardTitle" style={styles.driverName}>
                {user?.name || 'Deep Pathak'}
              </Text>
              <Chip
                label="VERIFIED DRIVER"
                variant="subtle"
                color={colors.brand}
                backgroundColor={colors.brandTint}
              />
            </View>
            <Text variant="caption" color={colors.ink2}>
              {user?.email || 'deep.driver@ecovolt.app'}
            </Text>
          </View>
        </View>

        {/* 2. Lifetime Green Impact Summary */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Impact')}
          style={styles.impactCard}
        >
          <View style={styles.impactHeader}>
            <View style={styles.impactTitleCol}>
              <Text variant="cardTitle" style={styles.impactTitle}>
                Lifetime Green Impact →
              </Text>
              <Text variant="micro" color={colors.ink3}>
                Calculated vs standard fossil grid emissions
              </Text>
            </View>
            <Chip
              label="ECO REWARDS"
              variant="solid"
              color="#FFFFFF"
              backgroundColor={colors.brand}
            />
          </View>

          <View style={styles.impactGrid}>
            <View style={styles.impactStat}>
              <Text variant="micro" color={colors.ink3}>
                CO₂ Avoided
              </Text>
              <Text variant="sectionLabel" color={colors.brand} style={styles.impactVal}>
                {impact.co2AvoidedKg.toFixed(1)}{' '}
                <Text variant="micro" color={colors.ink3}>
                  kg
                </Text>
              </Text>
            </View>

            <View style={styles.impactDivider} />

            <View style={styles.impactStat}>
              <Text variant="micro" color={colors.ink3}>
                ₹ Saved vs Sticker
              </Text>
              <Text variant="sectionLabel" color={colors.brand} style={styles.impactVal}>
                ₹{Math.round(impact.savedVsSticker)}
              </Text>
            </View>

            <View style={styles.impactDivider} />

            <View style={styles.impactStat}>
              <Text variant="micro" color={colors.ink3}>
                Avg Greenness
              </Text>
              <Text variant="sectionLabel" color={colors.brand} style={styles.impactVal}>
                {Math.round(impact.avgRenewablePct)}%
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 2b. Bookings & Reservation History Shortcut */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Bookings')}
          style={styles.bookingsNavCard}
        >
          <View style={styles.bookingsNavLeft}>
            <Text style={styles.bookingsNavIcon}>📅</Text>
            <View>
              <Text variant="cardTitle">My Bookings & History</Text>
              <Text variant="caption" color={colors.ink2}>
                View scheduled slots, active sessions & past receipts
              </Text>
            </View>
          </View>
          <Text variant="cardTitle" color={colors.brand}>
            →
          </Text>
        </TouchableOpacity>

        {/* 3. My EV Garage Header */}
        <View style={styles.garageHeader}>
          <View style={styles.titleCol}>
            <Text variant="sectionLabel" style={styles.sectionTitle}>
              My EV Garage
            </Text>
            <Text variant="caption" color={colors.ink2}>
              Active EV feeds range, travel cost & matching plugs
            </Text>
          </View>

          <Button
            label="+ Add EV"
            variant="primary"
            onPress={handleOpenAdd}
            style={styles.addBtn}
          />
        </View>

        {/* 4. Vehicles List */}
        {vehicles.length === 0 ? (
          <EmptyState
            title="No EVs in Garage"
            message="Add your EV to calculate true travel costs and matching connectors."
            actionLabel="Add Vehicle"
            onAction={handleOpenAdd}
            style={styles.emptyCard}
          />
        ) : (
          <View style={styles.vehiclesList}>
            {vehicles.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                isActive={v.id === activeVehicleId}
                onSelect={() => setActiveVehicle(v.id)}
                onEdit={() => handleOpenEdit(v)}
                onDelete={() => handleDelete(v)}
              />
            ))}
          </View>
        )}

        {/* 5. Account Sign Out */}
        <View style={styles.accountSection}>
          <Button
            label="Sign Out of Account"
            variant="ghost"
            onPress={() => logout()}
            style={styles.logoutBtn}
          />
        </View>
      </ScrollView>

      {/* Vehicle Form Modal */}
      <VehicleFormModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialVehicle={editingVehicle}
        onSave={handleSaveVehicle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    padding: spacing.base,
    gap: spacing.base,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.e1,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontFamily: 'Manrope_700Bold',
  },
  driverMetaCol: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driverName: {
    fontFamily: 'Manrope_700Bold',
  },
  impactCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.e1,
  },
  impactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  impactTitleCol: {
    flex: 1,
    gap: 2,
  },
  impactTitle: {
    fontFamily: 'Manrope_600SemiBold',
  },
  impactGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.lg,
    padding: spacing.sm + 2,
  },
  impactStat: {
    flex: 1,
    gap: 2,
    alignItems: 'center',
  },
  impactVal: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
  },
  impactDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  garageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
  },
  addBtn: {
    height: 40,
    paddingHorizontal: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vehiclesList: {
    gap: spacing.base,
  },
  accountSection: {
    paddingTop: spacing.sm,
  },
  logoutBtn: {
    width: '100%',
  },
  bookingsNavCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.e1,
  },
  bookingsNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  bookingsNavIcon: {
    fontSize: 24,
  },
});
