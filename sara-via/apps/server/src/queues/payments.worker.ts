import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PaymentsQueueService } from './payments-queue.service';
import { PiNetworkService } from '../payments/pi-network.service';

async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const queue = app.get(PaymentsQueueService);
  const pi = app.get(PiNetworkService);

  setInterval(async () => {
    const job = await queue.pull();
    if (!job) {
      return;
    }

    try {
      await pi.getPayment(job.paymentId);
      console.info('Processed reconciliation job', job.paymentId, job.reason);
    } catch (error) {
      console.error('Failed reconciliation job', job.paymentId, error);
    }
  }, 2500);
}

void bootstrapWorker();
