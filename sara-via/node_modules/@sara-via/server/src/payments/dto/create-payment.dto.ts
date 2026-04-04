import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  uid: z.string().min(1),
  bookingReference: z.string().min(4).max(80),
  amount: z.number().positive(),
  memo: z.string().min(3).max(255),
  metadata: z.record(z.any())
});

export type CreatePaymentDto = z.infer<typeof createPaymentIntentSchema>;
