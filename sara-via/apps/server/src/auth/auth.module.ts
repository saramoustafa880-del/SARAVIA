import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PiAuthStrategy } from './pi-auth.strategy';
import { PaymentsModule } from '../payments/payments.module';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

@Module({
  imports: [JwtModule.register({}), PaymentsModule],
  controllers: [AuthController],
  providers: [AuthService, PiAuthStrategy, RateLimitGuard],
  exports: [AuthService]
})
export class AuthModule {}
