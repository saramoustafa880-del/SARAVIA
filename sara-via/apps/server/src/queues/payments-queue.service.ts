import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

interface PaymentQueueJob {
  paymentId: string;
  reason: 'completion_retry' | 'webhook_reconcile' | 'manual_repair';
  enqueuedAt: string;
}

@Injectable()
export class PaymentsQueueService {
  private readonly queueKey = 'queue:payments:reconciliation';

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async enqueue(job: PaymentQueueJob): Promise<void> {
    await this.redis.lpush(this.queueKey, JSON.stringify(job));
  }

  async pull(): Promise<PaymentQueueJob | null> {
    const payload = await this.redis.rpop(this.queueKey);
    return payload ? (JSON.parse(payload) as PaymentQueueJob) : null;
  }
}
