import { Controller, Get, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/observability')
export class MetricsController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis
  ) {}

  @Get('metrics')
  async getMetrics() {
    const [transactions, activeRefreshSessions, redisPing] = await Promise.all([
      this.prisma.transaction.count(),
      this.prisma.refreshTokenSession.count({ where: { revokedAt: null } }),
      this.redis.ping()
    ]);

    return {
      service: 'sara-via-server',
      transactions,
      activeRefreshSessions,
      redis: redisPing,
      timestamp: new Date().toISOString()
    };
  }
}
