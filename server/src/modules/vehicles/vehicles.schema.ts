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
  vehicleClass: z.enum(['car', 'bike'], {
    errorMap: () => ({ message: 'vehicleClass must be car or bike' }),
  }),
  model: z.string().trim().optional(),
  batteryKwh: z.number().positive('batteryKwh must be greater than 0').optional(),
  efficiencyWhKm: z.number().positive('efficiencyWhKm must be greater than 0').optional(),
  connectors: z.array(connectorEnum).min(1, 'At least one connector must be specified').optional(),
  currentChargePct: z
    .number()
    .min(0, 'currentChargePct must be at least 0')
    .max(100, 'currentChargePct cannot exceed 100')
    .default(50),
});

export const updateVehicleSchema = z.object({
  model: z.string().trim().optional(),
  batteryKwh: z.number().positive('batteryKwh must be greater than 0').optional(),
  efficiencyWhKm: z.number().positive('efficiencyWhKm must be greater than 0').optional(),
  connectors: z.array(connectorEnum).min(1, 'At least one connector must be specified').optional(),
  currentChargePct: z
    .number()
    .min(0, 'currentChargePct must be at least 0')
    .max(100, 'currentChargePct cannot exceed 100')
    .optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
