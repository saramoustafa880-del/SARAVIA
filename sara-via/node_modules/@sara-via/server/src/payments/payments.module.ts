import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PiNetworkService } from './pi-network.service';
import { PaymentsRepository } from './payments.repository';
import { PiAuthGuard } from '../common/guards/pi-auth.guard';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [PaymentsController],
  providers: [PaymentsService, PiNetworkService, PaymentsRepository, PiAuthGuard, RateLimitGuard],
  exports: [PaymentsService, PiNetworkService]
})
export class PaymentsModule {}
