import { z } from 'zod';

export const stopSessionSchema = z.object({
  energyKwh: z
    .number()
    .positive('energyKwh must be greater than 0')
    .optional(),
});

export type StopSessionInput = z.infer<typeof stopSessionSchema>;
