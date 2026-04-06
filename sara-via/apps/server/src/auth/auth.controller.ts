import { Body, Controller, Headers, Ip, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { z } from 'zod';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { RefreshTokenDto, refreshTokenSchema } from './dto/refresh-token.dto';

const loginSchema = z.object({
  accessToken: z.string().min(1)
});

@Controller('api/v1/auth/pi')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: z.infer<typeof loginSchema>,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string
  ) {
    return this.authService.loginWithPi(body.accessToken, { ipAddress, userAgent });
  }

  @Post('refresh')
  async refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) body: RefreshTokenDto,
    @Ip() ipAddress: string,
    @Req() request: Request
  ) {
    return this.authService.refreshSession(body.refreshToken, {
      ipAddress,
      userAgent: request.headers['user-agent']
    });
  }
}
