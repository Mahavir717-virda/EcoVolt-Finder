import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Vehicle } from '@contracts/types';
import {
  useVehiclesStore,
  VehicleCard,
  VehicleFormModal,
  VehicleFormData,
} from '../../features/vehicles';
import { Text, Button, EmptyState, SkeletonCard } from '../../components';
import { colors, radii, shadows, spacing } from '../../theme/tokens';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export const VehiclesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {
    vehicles,
    activeVehicleId,
    isLoading,
    hydrate,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    setActiveVehicle,
  } = useVehiclesStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleDelete = (vehicle: Vehicle) => {
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

  const canGoBack = navigation.canGoBack();

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
        {/* Header Title & Add Button */}
        <View style={styles.headerRow}>
          <View style={styles.titleCol}>
            <Text variant="sectionLabel" style={styles.pageTitle}>
              My EV Garage
            </Text>
            <Text variant="caption" color={colors.ink2}>
              Manage your EV models, battery capacity & connectors
            </Text>
          </View>

          <Button
            label="+ Add EV"
            variant="primary"
            onPress={handleOpenAdd}
            style={styles.addBtn}
          />
        </View>

        {/* Vehicles List */}
        {isLoading ? (
          <View style={styles.skeletonGroup}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : vehicles.length === 0 ? (
          <EmptyState
            title="Your Garage is Empty"
            message="Add your EV to enable range verification, travel cost calculations, and connector filtering."
            actionLabel="Add Your First EV"
            onAction={handleOpenAdd}
            style={styles.emptyCard}
          />
        ) : (
          <View style={styles.vehiclesList}>
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                isActive={vehicle.id === activeVehicleId}
                onSelect={() => setActiveVehicle(vehicle.id)}
                onEdit={() => handleOpenEdit(vehicle)}
                onDelete={() => handleDelete(vehicle)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Modal Sheet */}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  pageTitle: {
    fontFamily: 'Manrope_700Bold',
  },
  addBtn: {
    height: 40,
    paddingHorizontal: spacing.md,
  },
  skeletonGroup: {
    gap: spacing.base,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.e1,
  },
  vehiclesList: {
    gap: spacing.base,
  },
});
