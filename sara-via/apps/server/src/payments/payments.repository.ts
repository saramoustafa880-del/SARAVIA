import { Injectable } from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateIntentRecord {
  paymentIntentId: string;
  pioneerUid: string;
  bookingReference: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createIntent(input: CreateIntentRecord) {
    return this.prisma.transaction.create({
      data: {
        paymentIntentId: input.paymentIntentId,
        pioneerUid: input.pioneerUid,
        bookingReference: input.bookingReference,
        amount: new Prisma.Decimal(input.amount.toFixed(7)),
        memo: input.memo,
        metadata: input.metadata,
        status: TransactionStatus.PENDING_INTENT
      }
    });
  }

  async findByPaymentIntentId(paymentIntentId: string) {
    return this.prisma.transaction.findUnique({ where: { paymentIntentId } });
  }

  async findByPiPaymentId(piPaymentId: string) {
    return this.prisma.transaction.findFirst({ where: { piPaymentId } });
  }

  async updateByPaymentIntentId(paymentIntentId: string, data: Prisma.TransactionUpdateInput) {
    return this.prisma.transaction.update({
      where: { paymentIntentId },
      data
    });
  }

  async updateByPiPaymentId(piPaymentId: string, data: Prisma.TransactionUpdateInput) {
    return this.prisma.transaction.update({
      where: { piPaymentId },
      data
    });
  }
}
