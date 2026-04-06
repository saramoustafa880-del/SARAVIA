import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('SARA VIA'),
  APP_PORT: z.coerce.number().default(4000),
  APP_BASE_URL: z.string().url().default('http://localhost:4000'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,https://sara-via.netlify.app'),
  PI_API_BASE_URL: z.string().url().default('https://api.minepi.com/v2'),
  PI_API_KEY: z.string().min(1),
  PI_APP_ID: z.string().min(1),
  PI_RECEIVER_ADDRESS: z.string().min(32),
  REDIS_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  MONGODB_URI: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_INDEX: z.string().optional(),
  PINECONE_NAMESPACE: z.string().optional(),
  JWT_PRIVATE_KEY_B64: z.string().min(1),
  JWT_PUBLIC_KEY_B64: z.string().min(1),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  PI_WEBHOOK_SECRET: z.string().min(1),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(120),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  WEBHOOK_REPLAY_TTL_SECONDS: z.coerce.number().default(600)
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  return envSchema.parse(config);
}
