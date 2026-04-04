import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PiNetworkService } from '../payments/pi-network.service';

@Injectable()
export class PiAuthStrategy {
  constructor(private readonly piNetworkService: PiNetworkService) {}

  async validateAccessToken(accessToken: string): Promise<{ uid: string; username?: string }> {
    const user = await this.piNetworkService.getCurrentUser(accessToken);

    if (!user.uid) {
      throw new UnauthorizedException('Pi access token validation failed');
    }

    return user;
  }
}
