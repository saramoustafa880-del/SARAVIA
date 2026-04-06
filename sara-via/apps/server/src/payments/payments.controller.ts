import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PiAuthGuard } from '../common/guards/pi-auth.guard';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApprovePaymentDto, approvePaymentSchema } from './dto/approve-payment.dto';
import { CompletePaymentDto, completePaymentSchema } from './dto/complete-payment.dto';
import { CreatePaymentDto, createPaymentIntentSchema } from './dto/create-payment.dto';
import { PiWebhookDto, piWebhookSchema } from './dto/pi-webhook.dto';
import { PaymentsService } from './payments.service';

@Controller('api/v1/payments/pi')
@UseGuards(RateLimitGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intents')
  @UseGuards(PiAuthGuard)
  createIntent(
    @CurrentUser() user: { uid: string },
    @Body(new ZodValidationPipe(createPaymentIntentSchema)) body: CreatePaymentDto
  ) {
    return this.paymentsService.createIntent(user, body);
  }

  @Post('approve')
  @UseGuards(PiAuthGuard)
  approve(
    @CurrentUser() user: { uid: string },
    @Body(new ZodValidationPipe(approvePaymentSchema)) body: ApprovePaymentDto
  ) {
    return this.paymentsService.approvePayment(user, body);
  }

  @Post('complete')
  @UseGuards(PiAuthGuard)
  complete(
    @CurrentUser() user: { uid: string },
    @Body(new ZodValidationPipe(completePaymentSchema)) body: CompletePaymentDto
  ) {
    return this.paymentsService.completePayment(user, body);
  }

  @Get(':paymentId/verify')
  @UseGuards(PiAuthGuard)
  verify(@CurrentUser() user: { uid: string }, @Param('paymentId') paymentId: string) {
    return this.paymentsService.verifyPayment(user, paymentId);
  }

  @Post('webhooks/reconcile')
  reconcile(
    @Body(new ZodValidationPipe(piWebhookSchema)) body: PiWebhookDto,
    @Headers('x-sara-signature') signature?: string
  ) {
    return this.paymentsService.reconcileFromWebhook(body, signature);
  }
}
