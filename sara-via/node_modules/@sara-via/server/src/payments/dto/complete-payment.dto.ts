import { z } from 'zod';

export const completePaymentSchema = z.object({
  paymentId: z.string().min(1),
  txid: z.string().min(8)
});

export type CompletePaymentDto = z.infer<typeof completePaymentSchema>;
