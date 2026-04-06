import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionStatus } from '@prisma/client';
import Redis from 'ioredis';
import crypto from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PaymentsQueueService } from '../queues/payments-queue.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ApprovePaymentDto } from './dto/approve-payment.dto';
import { CompletePaymentDto } from './dto/complete-payment.dto';
import { PiWebhookDto } from './dto/pi-webhook.dto';
import { PaymentsRepository } from './payments.repository';
import { PiNetworkService } from './pi-network.service';
import { PiPaymentDto } from './schemas/transaction.schema';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repository: PaymentsRepository,
    private readonly piNetworkService: PiNetworkService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly paymentsQueueService: PaymentsQueueService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis
  ) {}

  private extractPioneerUid(payment: PiPaymentDto): string {
    return payment.pioneer_uid ?? payment.Pioneer_uid ?? payment.user_uid ?? '';
  }

  private assertPaymentMatchesIntent(expected: {
    pioneerUid: string;
    amount: number;
    memo: string;
    receiverAddress: string;
  }, payment: PiPaymentDto): void {
    const pioneerUid = this.extractPioneerUid(payment);

    if (pioneerUid !== expected.pioneerUid) {
      throw new UnauthorizedException('Pi payment UID does not match the authenticated pioneer');
    }

    if (Number(payment.amount) !== Number(expected.amount)) {
      throw new BadRequestException('Pi payment amount does not match the booking intent');
    }

    if (payment.memo !== expected.memo) {
      throw new BadRequestException('Pi payment memo does not match the booking intent');
    }

    if ((payment.to_address ?? '').trim() !== expected.receiverAddress.trim()) {
      throw new BadRequestException('Pi payment destination wallet does not match the configured treasury wallet');
    }
  }

  private deriveStatus(payment: PiPaymentDto): TransactionStatus {
    if (payment.status.canceled || payment.status.Pioneer_cancelled) {
      return TransactionStatus.CANCELLED;
    }

    if (payment.status.developer_completed && payment.status.transaction_verified) {
      return TransactionStatus.COMPLETED;
    }

    if (payment.status.developer_approved) {
      return TransactionStatus.APPROVED;
    }

    return TransactionStatus.AWAITING_APPROVAL;
  }

  private async persistFromPiPayment(paymentId: string, payment: PiPaymentDto) {
    const status = this.deriveStatus(payment);
    return this.repository.updateByPiPaymentId(paymentId, {
      status,
      txid: payment.transaction?.txid,
      developerApproved: payment.status.developer_approved,
      transactionVerified: payment.status.transaction_verified,
      developerCompleted: payment.status.developer_completed,
      cancelled: payment.status.canceled,
      pioneerCancelled: payment.status.Pioneer_cancelled
    });
  }

  async createIntent(user: { uid: string }, dto: CreatePaymentDto) {
    if (user.uid !== dto.uid) {
      throw new UnauthorizedException('Zero trust violation: user UID mismatch');
    }

    const paymentIntentId = crypto.randomUUID();
    const record = await this.repository.createIntent({
      paymentIntentId,
      pioneerUid: dto.uid,
      bookingReference: dto.bookingReference,
      amount: dto.amount,
      memo: dto.memo,
      metadata: dto.metadata
    });

    await this.auditService.log({
      action: 'payment.intent.created',
      resource: 'transaction',
      resourceId: record.id,
      actorId: user.uid,
      payload: { paymentIntentId, amount: dto.amount, bookingReference: dto.bookingReference }
    });

    return {
      internalId: record.id,
      paymentIntentId,
      bookingReference: record.bookingReference,
      treasuryWallet: this.configService.getOrThrow<string>('app.piReceiverAddress')
    };
  }

  async approvePayment(user: { uid: string }, dto: ApprovePaymentDto) {
    const intent = await this.repository.findByPaymentIntentId(dto.paymentIntentId);

    if (!intent) {
      throw new NotFoundException('Payment intent was not found');
    }

    if (intent.pioneerUid !== user.uid) {
      throw new UnauthorizedException('Authenticated user does not own this payment intent');
    }

    const currentPiPayment = await this.piNetworkService.getPayment(dto.paymentId);
    this.assertPaymentMatchesIntent(
      {
        pioneerUid: intent.pioneerUid,
        amount: Number(intent.amount),
        memo: intent.memo,
        receiverAddress: this.configService.getOrThrow<string>('app.piReceiverAddress')
      },
      currentPiPayment
    );

    const approvedPiPayment = await this.piNetworkService.approvePayment(dto.paymentId);

    const record = await this.repository.updateByPaymentIntentId(dto.paymentIntentId, {
      piPaymentId: dto.paymentId,
      status: TransactionStatus.APPROVED,
      developerApproved: approvedPiPayment.status.developer_approved,
      cancelled: approvedPiPayment.status.canceled,
      pioneerCancelled: approvedPiPayment.status.Pioneer_cancelled
    });

    await this.redis.setex(`payment:${dto.paymentId}:status`, 60, JSON.stringify(approvedPiPayment));
    await this.auditService.log({
      action: 'payment.approved',
      resource: 'transaction',
      resourceId: record.id,
      actorId: user.uid,
      payload: { paymentId: dto.paymentId, paymentIntentId: dto.paymentIntentId }
    });

    return {
      ok: true,
      paymentId: dto.paymentId,
      status: approvedPiPayment.status
    };
  }

  async completePayment(user: { uid: string }, dto: CompletePaymentDto) {
    const record = await this.repository.findByPiPaymentId(dto.paymentId);

    if (!record) {
      throw new NotFoundException('Pi payment record was not found');
    }

    if (record.pioneerUid !== user.uid) {
      throw new UnauthorizedException('Authenticated user does not own this Pi payment');
    }

    try {
      const completedPiPayment = await this.piNetworkService.completePayment(dto.paymentId, dto.txid);

      if (completedPiPayment.transaction?.txid !== dto.txid) {
        throw new ConflictException('Pi completion response returned a different transaction id');
      }

      const updated = await this.repository.updateByPiPaymentId(dto.paymentId, {
        status: this.deriveStatus(completedPiPayment),
        txid: dto.txid,
        developerApproved: completedPiPayment.status.developer_approved,
        transactionVerified: completedPiPayment.status.transaction_verified,
        developerCompleted: completedPiPayment.status.developer_completed,
        cancelled: completedPiPayment.status.canceled,
        pioneerCancelled: completedPiPayment.status.Pioneer_cancelled
      });

      await this.redis.setex(`payment:${dto.paymentId}:status`, 60, JSON.stringify(completedPiPayment));
      await this.auditService.log({
        action: 'payment.completed',
        resource: 'transaction',
        resourceId: updated.id,
        actorId: user.uid,
        payload: { paymentId: dto.paymentId, txid: dto.txid }
      });

      return {
        ok: true,
        paymentId: dto.paymentId,
        txid: dto.txid,
        verified: completedPiPayment.status.transaction_verified,
        completed: completedPiPayment.status.developer_completed
      };
    } catch (error) {
      await this.paymentsQueueService.enqueue({
        paymentId: dto.paymentId,
        reason: 'completion_retry',
        enqueuedAt: new Date().toISOString()
      });
      throw error;
    }
  }

  async verifyPayment(user: { uid: string }, paymentId: string) {
    const record = await this.repository.findByPiPaymentId(paymentId);

    if (!record) {
      throw new NotFoundException('Pi payment record was not found');
    }

    if (record.pioneerUid !== user.uid) {
      throw new UnauthorizedException('Authenticated user does not own this Pi payment');
    }

    const cached = await this.redis.get(`payment:${paymentId}:status`);
    const payment = cached ? (JSON.parse(cached) as PiPaymentDto) : await this.piNetworkService.getPayment(paymentId);

    await this.persistFromPiPayment(paymentId, payment);

    return {
      paymentId,
      status: payment.status,
      transaction: payment.transaction,
      bookingReference: record.bookingReference
    };
  }

  verifyWebhookSignature(dto: PiWebhookDto, signature: string | undefined): void {
    const secret = this.configService.getOrThrow<string>('app.webhookSecret');
    const payload = `${dto.event}:${dto.paymentId}:${dto.txid ?? ''}:${dto.issuedAt}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    if (!signature) {
      throw new UnauthorizedException('Webhook signature is invalid');
    }

    const provided = Buffer.from(signature, 'utf8');
    const calculated = Buffer.from(expected, 'utf8');
    if (provided.length !== calculated.length || !crypto.timingSafeEqual(provided, calculated)) {
      throw new UnauthorizedException('Webhook signature is invalid');
    }
  }

  async reconcileFromWebhook(dto: PiWebhookDto, signature: string | undefined) {
    this.verifyWebhookSignature(dto, signature);

    const replayKey = `webhook:replay:${dto.event}:${dto.paymentId}:${dto.txid ?? 'no-txid'}:${dto.issuedAt}`;
    const replayTtl = this.configService.getOrThrow<number>('app.webhookReplayTtlSeconds');
    const replayAccepted = await this.redis.set(replayKey, '1', 'EX', replayTtl, 'NX');
    if (!replayAccepted) {
      throw new ConflictException('Duplicate webhook detected and blocked');
    }

    const record = await this.repository.findByPiPaymentId(dto.paymentId);
    if (!record) {
      throw new NotFoundException('Pi payment for reconciliation was not found');
    }

    const latest = await this.piNetworkService.getPayment(dto.paymentId);
    await this.persistFromPiPayment(dto.paymentId, latest);
    await this.redis.setex(`payment:${dto.paymentId}:status`, 60, JSON.stringify(latest));
    await this.paymentsQueueService.enqueue({
      paymentId: dto.paymentId,
      reason: 'webhook_reconcile',
      enqueuedAt: new Date().toISOString()
    });

    await this.auditService.log({
      action: 'payment.webhook.reconciled',
      resource: 'transaction',
      resourceId: record.id,
      actorId: record.pioneerUid,
      payload: { event: dto.event, paymentId: dto.paymentId, txid: dto.txid }
    });

    return {
      ok: true,
      paymentId: dto.paymentId,
      latestStatus: latest.status
    };
  }
}
