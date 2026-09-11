import { z } from 'zod';

const powerProviderEnum = z.enum([
  'torrent_power',
  'guvnl_gb',
  'adani_energy',
  'tata_power',
  'bses',
  'msedcl',
  'other',
]);

const connectorTypeEnum = z.enum([
  'ccs2',
  'chademo',
  'type2_ac',
  'bharat_dc_001',
  'bharat_ac_001',
  'three_pin',
]);

export const searchStationsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(150).default(15),
  connector: connectorTypeEnum.optional(),
  class: z.enum(['car', 'bike']).optional(),
  sort: z.enum(['nearest', 'greenest', 'true_cost']).default('nearest'),
});

export const createStationSchema = z.object({
  name: z.string().trim().min(3, 'Station name must be at least 3 characters'),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  address: z.string().trim().default('Ahmedabad, Gujarat'),
  provider: powerProviderEnum,
  zoneId: z.string().default('IN-WE'),
  connectors: z
    .array(
      z.object({
        type: connectorTypeEnum,
        powerKw: z.number().positive(),
        totalCount: z.number().int().positive().default(1),
        availableCount: z.number().int().min(0).default(1),
      })
    )
    .optional(),
});

export const updateStationSchema = z.object({
  name: z.string().trim().min(3).optional(),
  address: z.string().trim().optional(),
  provider: powerProviderEnum.optional(),
  isActive: z.boolean().optional(),
});

export const createConnectorSchema = z.object({
  type: connectorTypeEnum,
  powerKw: z.number().positive(),
  totalCount: z.number().int().positive().default(1),
  availableCount: z.number().int().min(0).default(1),
  status: z.string().default('available'),
});

export const updateConnectorSchema = z.object({
  powerKw: z.number().positive().optional(),
  totalCount: z.number().int().positive().optional(),
  availableCount: z.number().int().min(0).optional(),
  status: z.string().optional(),
});

export type SearchStationsQuery = z.infer<typeof searchStationsQuerySchema>;
export type CreateStationInput = z.infer<typeof createStationSchema>;
export type UpdateStationInput = z.infer<typeof updateStationSchema>;
export type CreateConnectorInput = z.infer<typeof createConnectorSchema>;
export type UpdateConnectorInput = z.infer<typeof updateConnectorSchema>;
