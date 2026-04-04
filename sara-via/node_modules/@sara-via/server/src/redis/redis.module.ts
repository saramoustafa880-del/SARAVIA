import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => new Redis(configService.getOrThrow<string>('app.redisUrl'))
    }
  ],
  exports: ['REDIS_CLIENT']
})
export class RedisModule {}
