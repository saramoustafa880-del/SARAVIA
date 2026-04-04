import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PiAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization as string | undefined;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required');
    }

    const token = authorization.slice('Bearer '.length);

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        algorithms: ['RS256'],
        publicKey: this.configService.getOrThrow<string>('app.jwt.publicKey'),
        issuer: this.configService.getOrThrow<string>('app.jwt.issuer'),
        audience: this.configService.getOrThrow<string>('app.jwt.audience')
      });

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('JWT is invalid or expired');
    }
  }
}
