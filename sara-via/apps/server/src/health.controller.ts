import { Controller, Get } from '@nestjs/common';

@Controller('api/v1/health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'sara-via-server',
      timestamp: new Date().toISOString()
    };
  }
}
