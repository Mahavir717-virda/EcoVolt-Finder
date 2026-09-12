import { z } from 'zod';
import { VehicleClass, ConnectorType } from '@prisma/client';

const connectorEnum = z.enum([
  'ccs2',
  'chademo',
  'type2_ac',
  'bharat_dc_001',
  'bharat_ac_001',
  'three_pin',
]);

export const createVehicleSchema = z.object({
  vehicleClass: z.enum(['car', 'bike', 'CAR', 'BIKE']).optional(),
  vehicle_class: z.enum(['car', 'bike', 'CAR', 'BIKE']).optional(),
  model: z.string().trim().optional(),
  name: z.string().trim().optional(),
  vehicleModel: z.string().trim().optional(),
  batteryKwh: z.number().positive('batteryKwh must be greater than 0').optional(),
  battery_kwh: z.number().positive('battery_kwh must be greater than 0').optional(),
  batteryCapacityKwh: z.number().positive('batteryCapacityKwh must be greater than 0').optional(),
  efficiencyWhKm: z.number().positive('efficiencyWhKm must be greater than 0').optional(),
  efficiency_wh_km: z.number().positive('efficiency_wh_km must be greater than 0').optional(),
  connectors: z.array(connectorEnum).min(1, 'At least one connector must be specified').optional(),
  connector_types: z.array(connectorEnum).min(1, 'At least one connector must be specified').optional(),
  currentChargePct: z
    .number()
    .min(0, 'currentChargePct must be at least 0')
    .max(100, 'currentChargePct cannot exceed 100')
    .optional(),
  current_charge_pct: z
    .number()
    .min(0, 'current_charge_pct must be at least 0')
    .max(100, 'current_charge_pct cannot exceed 100')
    .optional(),
  userId: z.string().optional(),
  user_id: z.string().optional(),
}).refine(
  (data) => data.vehicleClass !== undefined || data.vehicle_class !== undefined,
  { message: 'vehicleClass must be car or bike', path: ['vehicleClass'] }
);

export const updateVehicleSchema = z.object({
  model: z.string().trim().optional(),
  name: z.string().trim().optional(),
  vehicleModel: z.string().trim().optional(),
  vehicleClass: z.enum(['car', 'bike', 'CAR', 'BIKE']).optional(),
  vehicle_class: z.enum(['car', 'bike', 'CAR', 'BIKE']).optional(),
  batteryKwh: z.number().positive('batteryKwh must be greater than 0').optional(),
  battery_kwh: z.number().positive('battery_kwh must be greater than 0').optional(),
  batteryCapacityKwh: z.number().positive('batteryCapacityKwh must be greater than 0').optional(),
  efficiencyWhKm: z.number().positive('efficiencyWhKm must be greater than 0').optional(),
  efficiency_wh_km: z.number().positive('efficiency_wh_km must be greater than 0').optional(),
  connectors: z.array(connectorEnum).min(1, 'At least one connector must be specified').optional(),
  connector_types: z.array(connectorEnum).min(1, 'At least one connector must be specified').optional(),
  currentChargePct: z
    .number()
    .min(0, 'currentChargePct must be at least 0')
    .max(100, 'currentChargePct cannot exceed 100')
    .optional(),
  current_charge_pct: z
    .number()
    .min(0, 'current_charge_pct must be at least 0')
    .max(100, 'current_charge_pct cannot exceed 100')
    .optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
