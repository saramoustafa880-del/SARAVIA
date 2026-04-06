import { Global, Module } from '@nestjs/common';
import { PaymentsQueueService } from './payments-queue.service';

@Global()
@Module({
  providers: [PaymentsQueueService],
  exports: [PaymentsQueueService]
})
export class QueuesModule {}
