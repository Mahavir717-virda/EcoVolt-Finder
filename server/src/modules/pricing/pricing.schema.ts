import { z } from 'zod';

const connectorEnum = z.enum([
  'ccs2',
  'chademo',
  'type2_ac',
  'bharat_dc_001',
  'bharat_ac_001',
  'three_pin',
]);

export const quoteQuerySchema = z.object({
  stationId: z.string().min(1, 'stationId is required'),
  connector: connectorEnum,
  kwh: z.coerce.number().positive('kwh must be greater than 0').default(20.0),
  at: z.string().datetime().optional(), // ISO 8601 UTC timestamp
});

export const updatePricingRuleSchema = z.object({
  connectorId: z.string().uuid().optional(),
  providerMarkup: z
    .number()
    .min(0, 'providerMarkup cannot be negative (Edge Case #24)')
    .optional(),
  enableDynamicDiscount: z.boolean().optional(),
  discountMaxKwh: z.number().min(0).optional(),
});

export type QuoteQuery = z.infer<typeof quoteQuerySchema>;
export type UpdatePricingRuleInput = z.infer<typeof updatePricingRuleSchema>;
