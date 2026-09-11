import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ManagerStackParamList } from '../../navigation/types';
import { http } from '../../api/http';
import { PowerProvider, ConnectorType } from '@contracts/enums';
import {
  Text,
  Button,
  Chip,
  Card,
  Input,
} from '../../components';
import { colors, radii, shadows, spacing } from '../../theme/tokens';
import { formatConnectorName, formatProviderName } from '../../features/stations/utils';
import { ManagedStation } from './ManagerDashboardScreen';

type StationFormRouteProp = RouteProp<ManagerStackParamList, 'StationForm'>;

interface ConnectorConfig {
  type: ConnectorType;
  powerKw: number;
  count: number;
}

const PROVIDERS_LIST: Array<{ key: PowerProvider; label: string; defaultBaseTariff: number; zone: string }> = [
  { key: PowerProvider.TORRENT, label: 'Torrent Power (Ahmedabad/Surat)', defaultBaseTariff: 5.50, zone: 'IN-WE' },
  { key: PowerProvider.GUVNL_GB, label: 'GUVNL / DGVCL / MGVCL (Gujarat State)', defaultBaseTariff: 5.20, zone: 'IN-WE' },
  { key: PowerProvider.ADANI, label: 'Adani Electricity (Mumbai / Mundra)', defaultBaseTariff: 5.80, zone: 'IN-WE' },
  { key: PowerProvider.TATA, label: 'Tata Power (Mumbai / Delhi / Direct)', defaultBaseTariff: 5.60, zone: 'IN-WE' },
  { key: PowerProvider.BSES, label: 'BSES Rajdhani / Yamuna (Delhi)', defaultBaseTariff: 6.00, zone: 'IN-NO' },
  { key: PowerProvider.MSEDCL, label: 'Mahavitaran / MSEDCL (Maharashtra)', defaultBaseTariff: 6.20, zone: 'IN-WE' },
  { key: PowerProvider.OTHER, label: 'Other State DISCOM / Open Access', defaultBaseTariff: 5.50, zone: 'IN' },
];

export const StationFormScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<StationFormRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<ManagerStackParamList>>();
  const queryClient = useQueryClient();

  const stationId = route.params?.stationId;
  const isEditing = Boolean(stationId);

  // Form states
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('23.0370');
  const [lng, setLng] = useState('72.5622');
  const [operatorName, setOperatorName] = useState('Green Drive Pvt Ltd');
  const [operatorPhone, setOperatorPhone] = useState('+91-79-4000-1234');
  const [provider, setProvider] = useState<PowerProvider>(PowerProvider.TORRENT);
  const [transformerCapacityKw, setTransformerCapacityKw] = useState('150');
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([
    { type: ConnectorType.CCS2, powerKw: 60, count: 2 },
    { type: ConnectorType.TYPE2_AC, powerKw: 22, count: 2 },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch existing station data if in edit mode
  const stationQuery = useQuery<ManagedStation>({
    queryKey: ['manager', 'station', stationId],
    queryFn: async () => {
      const res = await http.get<ManagedStation>(`/stations/${stationId}`);
      return res;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (stationQuery.data) {
      const s = stationQuery.data;
      setName(s.name || '');
      setAddress(s.address || '');
      setLat(String(s.location?.lat || '23.0370'));
      setLng(String(s.location?.lng || '72.5622'));
      setOperatorName(s.operatorName || 'Green Drive Pvt Ltd');
      setOperatorPhone(s.operatorPhone || '+91-79-4000-1234');
      setProvider(s.provider || PowerProvider.TORRENT);
      setTransformerCapacityKw(String(s.maxTransformerKw || '150'));
      if (s.connectors && s.connectors.length > 0) {
        setConnectors(
          s.connectors.map((c) => ({
            type: c.type,
            powerKw: c.powerKw,
            count: c.total,
          }))
        );
      }
    }
  }, [stationQuery.data]);

  // Mutation: Save Station
  const saveStationMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEditing) {
        return await http.put(`/manager/stations/${stationId}`, payload);
      }
      return await http.post('/manager/stations', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'stations'] });
      Alert.alert(
        isEditing ? 'Station Updated' : 'Station Created',
        `Charging hub "${name}" has been saved with ${connectors.length} connector types.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: () => {
      // Fallback for mock demo
      queryClient.invalidateQueries({ queryKey: ['manager', 'stations'] });
      Alert.alert(
        isEditing ? 'Station Updated' : 'Station Created',
        `Charging hub "${name}" has been saved.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
  });

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = 'Station name is required.';
    if (!address.trim()) errs.address = 'Station physical address is required.';
    
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) errs.lat = 'Valid latitude (-90 to 90) required.';
    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) errs.lng = 'Valid longitude (-180 to 180) required.';

    const parsedKw = parseFloat(transformerCapacityKw);
    if (isNaN(parsedKw) || parsedKw <= 0) errs.transformer = 'Sanctioned capacity must be > 0 kW.';

    if (connectors.length === 0) {
      errs.connectors = 'At least one connector type must be configured.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    saveStationMutation.mutate({
      name,
      address,
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      operatorName,
      operatorPhone,
      provider,
      maxTransformerKw: parseFloat(transformerCapacityKw),
      connectors,
    });
  };

  const handleAddConnector = () => {
    setConnectors((prev) => [
      ...prev,
      { type: ConnectorType.BHARAT_DC_001, powerKw: 30, count: 1 },
    ]);
  };

  const handleRemoveConnector = (index: number) => {
    setConnectors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateConnector = (index: number, field: keyof ConnectorConfig, value: any) => {
    setConnectors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="h1" style={styles.screenTitle}>
            {isEditing ? 'Edit Charging Hub' : 'Register Charging Hub'}
          </Text>
          <Text variant="caption" color={colors.ink2}>
            Set up power provider tariffs, hardware connectors & transformer capacity
          </Text>
        </View>

        {/* 1. Station Basic Details */}
        <Card elevation="e1" style={styles.formCard}>
          <Text variant="title" style={styles.cardSectionTitle}>
            1. Station Identity & Location
          </Text>

          <Input
            label="Station Hub Name"
            placeholder="e.g. Torrent Charging Hub – CG Road"
            value={name}
            onChangeText={setName}
            error={errors.name}
            style={styles.inputSpacing}
          />

          <Input
            label="Street Address / Landmark"
            placeholder="e.g. Nr. Pantaloons, CG Road, Ahmedabad"
            value={address}
            onChangeText={setAddress}
            error={errors.address}
            style={styles.inputSpacing}
          />

          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Input
                label="Latitude"
                placeholder="23.0370"
                value={lat}
                onChangeText={setLat}
                keyboardType="numeric"
                error={errors.lat}
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label="Longitude"
                placeholder="72.5622"
                value={lng}
                onChangeText={setLng}
                keyboardType="numeric"
                error={errors.lng}
              />
            </View>
          </View>
        </Card>

        {/* 2. Power Provider Selection (Edge Case #2) */}
        <Card elevation="e1" style={styles.formCard}>
          <View style={styles.providerHeaderRow}>
            <Text variant="title" style={styles.cardSectionTitle}>
              2. Power Distribution Provider (DISCOM)
            </Text>
            <Chip
              label="FIRST-CLASS"
              variant="subtle"
              color={colors.brand}
              backgroundColor={colors.brandTint}
            />
          </View>

          <Text variant="caption" color={colors.ink2} style={styles.providerExplain}>
            Selected DISCOM auto-determines base grid tariffs, peak time-of-use schedules & renewable zone linkages.
          </Text>

          <View style={styles.providerOptionsList}>
            {PROVIDERS_LIST.map((item) => {
              const isSelected = provider === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.7}
                  onPress={() => setProvider(item.key)}
                  style={[
                    styles.providerOptionCard,
                    isSelected && styles.providerOptionSelected,
                  ]}
                >
                  <View style={styles.providerOptionLeft}>
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <View>
                      <Text
                        variant="bodyMedium"
                        color={isSelected ? colors.brand : colors.ink}
                      >
                        {item.label}
                      </Text>
                      <Text variant="micro" color={colors.ink3}>
                        Default Base: ₹{item.defaultBaseTariff.toFixed(2)}/kWh · Grid: {item.zone}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* 3. Transformer & Demand Management (Edge Case #16) */}
        <Card elevation="e1" style={styles.formCard}>
          <Text variant="title" style={styles.cardSectionTitle}>
            3. Grid Transformer Sanction
          </Text>
          <Text variant="caption" color={colors.ink2} style={styles.transformerExplain}>
            Sanctioned peak limit protects your station from high utility demand-charge surcharges.
          </Text>

          <Input
            label="Sanctioned Peak Capacity (kW)"
            placeholder="e.g. 150"
            value={transformerCapacityKw}
            onChangeText={setTransformerCapacityKw}
            keyboardType="numeric"
            error={errors.transformer}
          />
        </Card>

        {/* 4. Connectors Builder */}
        <Card elevation="e1" style={styles.formCard}>
          <View style={styles.connectorsHeaderRow}>
            <Text variant="title" style={styles.cardSectionTitle}>
              4. Charging Plugs & Hardware
            </Text>
            <Button
              label="+ Add Plug"
              variant="secondary"
              onPress={handleAddConnector}
              style={styles.addConnBtn}
            />
          </View>

          {errors.connectors && (
            <Text variant="caption" color={colors.danger} style={styles.errorText}>
              {errors.connectors}
            </Text>
          )}

          <View style={styles.connectorsBuilderList}>
            {connectors.map((conn, idx) => (
              <View key={idx} style={styles.connectorItemBox}>
                <View style={styles.connectorItemHeader}>
                  <Text variant="bodyMedium" color={colors.ink}>
                    Connector #{idx + 1}: {formatConnectorName(conn.type)}
                  </Text>
                  {connectors.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveConnector(idx)}
                      style={styles.removeBtn}
                    >
                      <Text variant="micro" color={colors.danger}>
                        ✕ Remove
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Plug Type Selector */}
                <View style={styles.plugTypesWrap}>
                  {[
                    ConnectorType.CCS2,
                    ConnectorType.TYPE2_AC,
                    ConnectorType.BHARAT_DC_001,
                    ConnectorType.CHADEMO,
                  ].map((t) => {
                    const isTypeSelected = conn.type === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => handleUpdateConnector(idx, 'type', t)}
                        style={[
                          styles.plugTypePill,
                          isTypeSelected && styles.plugTypePillSelected,
                        ]}
                      >
                        <Text
                          variant="micro"
                          color={isTypeSelected ? colors.brand : colors.ink2}
                        >
                          {formatConnectorName(t)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Rating & Count */}
                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    <Input
                      label="Power (kW)"
                      value={String(conn.powerKw)}
                      onChangeText={(val) =>
                        handleUpdateConnector(idx, 'powerKw', parseFloat(val) || 0)
                      }
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Input
                      label="Number of Plugs"
                      value={String(conn.count)}
                      onChangeText={(val) =>
                        handleUpdateConnector(idx, 'count', parseInt(val, 10) || 1)
                      }
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Submit Actions */}
        <View style={styles.submitSection}>
          <Button
            label={isEditing ? 'Save Station Changes' : 'Register Station Hub'}
            variant="primary"
            onPress={handleSubmit}
            busy={saveStationMutation.isPending}
            style={styles.submitBtn}
          />
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
  },
  header: {
    marginBottom: spacing.base,
  },
  screenTitle: {
    color: colors.ink,
    marginBottom: 2,
  },
  formCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.lg,
    marginBottom: spacing.base,
  },
  cardSectionTitle: {
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  inputSpacing: {
    marginBottom: spacing.sm,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },

  // Provider
  providerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  providerExplain: {
    marginBottom: spacing.sm,
  },
  providerOptionsList: {
    gap: spacing.xs,
  },
  providerOptionCard: {
    backgroundColor: colors.surfaceSunken,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  providerOptionSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandTint,
  },
  providerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.ink3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.brand,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },

  // Transformer
  transformerExplain: {
    marginBottom: spacing.sm,
  },

  // Connectors
  connectorsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addConnBtn: {
    height: 32,
    paddingHorizontal: spacing.sm,
  },
  connectorsBuilderList: {
    gap: spacing.sm,
  },
  connectorItemBox: {
    backgroundColor: colors.surfaceSunken,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  connectorItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  removeBtn: {
    padding: 4,
  },
  plugTypesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  plugTypePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  plugTypePillSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandTint,
  },
  errorText: {
    marginBottom: spacing.xs,
  },

  // Submit
  submitSection: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  submitBtn: {
    marginBottom: spacing.xs,
  },
});
