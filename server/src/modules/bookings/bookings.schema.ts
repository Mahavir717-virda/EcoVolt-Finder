import { z } from 'zod';

const connectorEnum = z.enum([
  'ccs2',
  'chademo',
  'type2_ac',
  'bharat_dc_001',
  'bharat_ac_001',
  'three_pin',
]);

export const createBookingSchema = z
  .object({
    stationId: z.string().min(1, 'stationId is required'),
    connectorType: connectorEnum,
    vehicleId: z.string().min(1, 'vehicleId is required'),
    windowStart: z.string().datetime({ message: 'windowStart must be valid ISO 8601 UTC string' }),
    windowEnd: z.string().datetime({ message: 'windowEnd must be valid ISO 8601 UTC string' }),
    priceQuoteId: z.string().optional(),
  })
  .refine(
    (data) => new Date(data.windowEnd).getTime() > new Date(data.windowStart).getTime(),
    {
      message: 'windowEnd must be strictly after windowStart',
      path: ['windowEnd'],
    }
  );

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
