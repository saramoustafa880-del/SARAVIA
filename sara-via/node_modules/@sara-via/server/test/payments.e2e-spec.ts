import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PaymentsController } from '../src/payments/payments.controller';
import { PaymentsService } from '../src/payments/payments.service';
import { RateLimitGuard } from '../src/common/guards/rate-limit.guard';

describe('PaymentsController (e2e pattern)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            reconcileFromWebhook: jest.fn().mockResolvedValue({ ok: true })
          }
        },
        {
          provide: RateLimitGuard,
          useValue: { canActivate: jest.fn().mockResolvedValue(true) }
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a reconcile webhook when payload is valid', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payments/pi/webhooks/reconcile')
      .send({
        event: 'payment.reconcile',
        paymentId: 'pi-payment-1',
        txid: 'abcdef12345678',
        issuedAt: new Date().toISOString()
      })
      .expect(201);
  });
});
