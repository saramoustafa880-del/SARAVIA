import { z } from 'zod';

export const approvePaymentSchema = z.object({
  paymentId: z.string().min(1),
  paymentIntentId: z.string().uuid()
});

export type ApprovePaymentDto = z.infer<typeof approvePaymentSchema>;
