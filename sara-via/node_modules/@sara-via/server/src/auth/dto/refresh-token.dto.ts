import { z } from 'zod';

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(32)
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
