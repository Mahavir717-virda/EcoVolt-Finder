import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConnectorType, VehicleClass } from '@contracts/enums';
import { Vehicle } from '@contracts/types';
import {
  CAR_DEFAULTS,
  BIKE_DEFAULTS,
  POPULAR_EV_PRESETS,
  VehicleFormData,
} from './types';
import { vehicleSchema } from './validation';
import { formatConnectorName } from '../stations/utils';
import { colors, radii, shadows, spacing } from '../../theme/tokens';
import {
  Text,
  Input,
  Button,
  Chip,
  Sheet,
  SegmentedControl,
} from '../../components';

export interface VehicleFormModalProps {
  visible: boolean;
  onClose: () => void;
  initialVehicle?: Vehicle | null;
  onSave: (data: VehicleFormData) => Promise<void>;
}

const ALL_CONNECTORS: ConnectorType[] = [
  ConnectorType.CCS2,
  ConnectorType.TYPE2_AC,
  ConnectorType.BHARAT_DC_001,
  ConnectorType.BHARAT_AC_001,
  ConnectorType.CHADEMO,
  ConnectorType.THREE_PIN,
];

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  visible,
  onClose,
  initialVehicle,
  onSave,
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetHeight = Math.min(Math.round(windowHeight * 0.88), 750);
  const isEditing = !!initialVehicle;

  // Form fields state
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>(VehicleClass.CAR);
  const [model, setModel] = useState('');
  const [batteryKwh, setBatteryKwh] = useState('40.5');
  const [efficiencyWhKm, setEfficiencyWhKm] = useState('140');
  const [currentChargePct, setCurrentChargePct] = useState('50');
  const [connectors, setConnectors] = useState<ConnectorType[]>([
    ConnectorType.CCS2,
    ConnectorType.TYPE2_AC,
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Sync initial values when modal opens
  useEffect(() => {
    if (visible) {
      setErrors({});
      if (initialVehicle) {
        setVehicleClass(initialVehicle.vehicleClass);
        setModel(initialVehicle.model || '');
        setBatteryKwh(String(initialVehicle.batteryKwh));
        setEfficiencyWhKm(String(initialVehicle.efficiencyWhKm));
        setCurrentChargePct(String(initialVehicle.currentChargePct));
        setConnectors(initialVehicle.connectors || []);
      } else {
        // New vehicle defaults
        applyClassDefaults(VehicleClass.CAR);
      }
    }
  }, [visible, initialVehicle]);

  // Apply sensible per-class defaults (Edge Case #11)
  const applyClassDefaults = (vClass: VehicleClass) => {
    setVehicleClass(vClass);
    if (vClass === VehicleClass.CAR) {
      setModel(CAR_DEFAULTS.model);
      setBatteryKwh(String(CAR_DEFAULTS.batteryKwh));
      setEfficiencyWhKm(String(CAR_DEFAULTS.efficiencyWhKm));
      setCurrentChargePct(String(CAR_DEFAULTS.currentChargePct));
      setConnectors(CAR_DEFAULTS.connectors);
    } else {
      setModel(BIKE_DEFAULTS.model);
      setBatteryKwh(String(BIKE_DEFAULTS.batteryKwh));
      setEfficiencyWhKm(String(BIKE_DEFAULTS.efficiencyWhKm));
      setCurrentChargePct(String(BIKE_DEFAULTS.currentChargePct));
      setConnectors(BIKE_DEFAULTS.connectors);
    }
  };

  const applyPreset = (preset: (typeof POPULAR_EV_PRESETS)[0]) => {
    setVehicleClass(preset.vehicleClass);
    setModel(preset.name);
    setBatteryKwh(String(preset.batteryKwh));
    setEfficiencyWhKm(String(preset.efficiencyWhKm));
    setConnectors(preset.connectors);
  };

  const toggleConnector = (connector: ConnectorType) => {
    setConnectors((prev) => {
      const exists = prev.includes(connector);
      return exists
        ? prev.filter((c) => c !== connector)
        : [...prev, connector];
    });
  };

  // Range calculation preview
  const numBattery = parseFloat(batteryKwh) || 0;
  const numEfficiency = parseFloat(efficiencyWhKm) || 1;
  const numCharge = parseFloat(currentChargePct) || 0;
  const previewRangeKm =
    numBattery > 0 && numEfficiency > 0
      ? Math.round(((numBattery * (numCharge / 100) * 1000) / numEfficiency) * 10) / 10
      : 0;

  const handleSubmit = async () => {
    setErrors({});

    const formData = {
      vehicleClass,
      model: model.trim(),
      batteryKwh: parseFloat(batteryKwh),
      efficiencyWhKm: parseFloat(efficiencyWhKm),
      currentChargePct: parseFloat(currentChargePct),
      connectors,
    };

    // Zod validation (Edge Case #24)
    const result = vehicleSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[String(err.path[0])] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch {
      setErrors({ form: 'Failed to save vehicle. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      style={[styles.sheetContainer, { height: sheetHeight }]}
    >
      <View style={styles.headerRow}>
        <Text variant="title" style={styles.sheetTitle}>
          {isEditing ? 'Edit EV Profile' : 'Add EV to Garage'}
        </Text>
        <TouchableOpacity activeOpacity={0.7} onPress={onClose}>
          <Text variant="caption" color={colors.ink3}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={true}
      >
        {/* 1. Vehicle Class Selector */}
        <View style={styles.fieldSection}>
          <Text variant="caption" color={colors.ink2} style={styles.fieldLabel}>
            Vehicle Category
          </Text>
          <SegmentedControl<VehicleClass>
            options={[
              { label: '🚗 4-Wheeler (Car)', value: VehicleClass.CAR },
              { label: '🛵 2-Wheeler (Bike)', value: VehicleClass.BIKE },
            ]}
            value={vehicleClass}
            onChange={(val) => applyClassDefaults(val)}
          />
        </View>

        {/* 2. Popular Presets Quick Fill */}
        <View style={styles.fieldSection}>
          <Text variant="micro" color={colors.ink3}>
            Popular Models in India (Quick Fill)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsScroll}
          >
            {POPULAR_EV_PRESETS.filter((p) => p.vehicleClass === vehicleClass).map(
              (p, idx) => (
                <Chip
                  key={idx}
                  label={p.name}
                  variant="subtle"
                  color={colors.ink}
                  backgroundColor={colors.surfaceSunken}
                  onPress={() => applyPreset(p)}
                />
              )
            )}
          </ScrollView>
        </View>

        {/* 3. Model Name Input */}
        <Input
          label="Model / Name"
          placeholder="e.g. Tata Nexon EV Max"
          value={model}
          onChangeText={setModel}
          error={errors.model}
        />

        {/* 4. Battery & Efficiency Numeric Row */}
        <View style={styles.rowTwoCols}>
          <View style={styles.col}>
            <Input
              label="Battery (kWh)"
              placeholder="40.5"
              keyboardType="decimal-pad"
              value={batteryKwh}
              onChangeText={setBatteryKwh}
              error={errors.batteryKwh}
            />
          </View>
          <View style={styles.col}>
            <Input
              label="Efficiency (Wh/km)"
              placeholder="140"
              keyboardType="numeric"
              value={efficiencyWhKm}
              onChangeText={setEfficiencyWhKm}
              error={errors.efficiencyWhKm}
            />
          </View>
        </View>

        {/* 5. Current Charge % Input */}
        <Input
          label="Current Battery Charge (%)"
          placeholder="0–100"
          keyboardType="numeric"
          value={currentChargePct}
          onChangeText={setCurrentChargePct}
          error={errors.currentChargePct}
        />

        {/* 6. Dynamic Range Calculation Preview */}
        <View style={styles.previewBanner}>
          <View style={styles.previewTop}>
            <Text variant="micro" color={colors.brand} style={styles.previewLabel}>
              ⚡ Real-time Telemetry Range Preview:
            </Text>
            <Text variant="title" color={colors.brand} style={styles.previewNum}>
              ~{previewRangeKm} km
            </Text>
          </View>
          <Text variant="micro" color={colors.ink3}>
            Based on {currentChargePct}% battery ({((numBattery * numCharge) / 100).toFixed(1)} kWh available) at {efficiencyWhKm} Wh/km
          </Text>
        </View>

        {/* 7. Connectors Multi-Select */}
        <View style={styles.fieldSection}>
          <Text variant="caption" color={colors.ink2} style={styles.fieldLabel}>
            Supported Charging Connectors
          </Text>
          <View style={styles.chipsWrap}>
            {ALL_CONNECTORS.map((conn) => {
              const isSelected = connectors.includes(conn);
              return (
                <Chip
                  key={conn}
                  label={formatConnectorName(conn)}
                  variant={isSelected ? 'solid' : 'outline'}
                  color={isSelected ? colors.brand : colors.ink2}
                  backgroundColor={isSelected ? colors.brand : undefined}
                  onPress={() => toggleConnector(conn)}
                />
              );
            })}
          </View>
          {errors.connectors && (
            <Text variant="micro" color={colors.danger}>
              {errors.connectors}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footerRow, { paddingBottom: insets.bottom || spacing.sm }]}>
        <Button
          label={isEditing ? 'Save Changes' : 'Add to Garage'}
          variant="primary"
          busy={isSaving}
          onPress={handleSubmit}
          style={styles.saveBtn}
        />
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  sheetTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.sm + 2,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  fieldSection: {
    gap: 4,
  },
  fieldLabel: {
    fontFamily: 'Manrope_600SemiBold',
  },
  presetsScroll: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  col: {
    flex: 1,
  },
  previewBanner: {
    backgroundColor: colors.brandTint,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
    gap: 2,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontFamily: 'Manrope_700Bold',
  },
  previewNum: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  footerRow: {
    paddingTop: spacing.md,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  saveBtn: {
    width: '100%',
  },
});
