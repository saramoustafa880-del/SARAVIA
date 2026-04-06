import compression from 'compression';
import helmet from 'helmet';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditService } from './audit/audit.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);
  const auditService = app.get(AuditService);
  app.get(JwtService);

  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: configService.getOrThrow<string[]>('app.allowedOrigins'),
    credentials: true
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(auditService));

  const port = configService.getOrThrow<number>('app.port');
  await app.listen(port);
  logger.log(`SARA VIA server listening on ${port}`);
}

void bootstrap();
