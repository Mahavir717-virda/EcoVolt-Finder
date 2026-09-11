import { z } from 'zod';
import { ConnectorType, VehicleClass } from '@contracts/enums';

export const vehicleSchema = z.object({
  vehicleClass: z.nativeEnum(VehicleClass),
  model: z
    .string()
    .min(2, 'Please enter a vehicle model name (min 2 chars)')
    .max(60, 'Model name is too long'),
  batteryKwh: z.coerce
    .number({ invalid_type_error: 'Battery capacity must be a valid number' })
    .positive('Battery capacity must be greater than 0 kWh')
    .max(250, 'Battery capacity cannot exceed 250 kWh'),
  efficiencyWhKm: z.coerce
    .number({ invalid_type_error: 'Efficiency must be a valid number' })
    .positive('Efficiency must be greater than 0 Wh/km')
    .max(600, 'Efficiency cannot exceed 600 Wh/km'),
  connectors: z
    .array(z.nativeEnum(ConnectorType))
    .min(1, 'Please select at least one compatible connector type'),
  currentChargePct: z.coerce
    .number({ invalid_type_error: 'Charge % must be a number' })
    .min(0, 'Charge percentage cannot be less than 0%')
    .max(100, 'Charge percentage cannot exceed 100%'),
});

export type VehicleSchemaType = z.infer<typeof vehicleSchema>;
