import { z } from 'zod';

export const piWebhookSchema = z.object({
  event: z.enum(['payment.reconcile', 'payment.cancelled', 'payment.failed']),
  paymentId: z.string().min(1),
  txid: z.string().optional(),
  reason: z.string().optional(),
  issuedAt: z.string().datetime()
});

export type PiWebhookDto = z.infer<typeof piWebhookSchema>;
