import { registerAs } from '@nestjs/config';

const decodeKey = (value: string) => Buffer.from(value, 'base64').toString('utf8');

export default registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'SARA VIA',
  port: Number(process.env.APP_PORT ?? 4000),
  baseUrl: process.env.APP_BASE_URL ?? 'http://localhost:4000',
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,https://sara-via.netlify.app')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  piApiBaseUrl: process.env.PI_API_BASE_URL ?? 'https://api.minepi.com/v2',
  piApiKey: process.env.PI_API_KEY ?? '',
  piAppId: process.env.PI_APP_ID ?? '',
  piReceiverAddress: process.env.PI_RECEIVER_ADDRESS ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  rateLimit: {
    windowSeconds: Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60),
    maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 120)
  },
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  webhookReplayTtlSeconds: Number(process.env.WEBHOOK_REPLAY_TTL_SECONDS ?? 600),
  jwt: {
    issuer: process.env.JWT_ISSUER ?? 'sara-via.io',
    audience: process.env.JWT_AUDIENCE ?? 'sara-via-clients',
    privateKey: decodeKey(process.env.JWT_PRIVATE_KEY_B64 ?? ''),
    publicKey: decodeKey(process.env.JWT_PUBLIC_KEY_B64 ?? '')
  },
  webhookSecret: process.env.PI_WEBHOOK_SECRET ?? ''
}));
