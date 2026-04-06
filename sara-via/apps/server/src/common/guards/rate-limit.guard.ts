import { CanActivate, ExecutionContext, Injectable, TooManyRequestsException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const identifier = request.user?.uid ?? request.ip ?? 'anonymous';
    const windowSeconds = this.configService.getOrThrow<number>('app.rateLimit.windowSeconds');
    const maxRequests = this.configService.getOrThrow<number>('app.rateLimit.maxRequests');
    const key = `ratelimit:${identifier}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }

    if (count > maxRequests) {
      throw new TooManyRequestsException('Rate limit exceeded. Please retry shortly.');
    }

    return true;
  }
}
