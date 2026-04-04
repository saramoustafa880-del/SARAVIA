import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: async () => {
          await this.auditService.log({
            action: `${request.method}:${request.route?.path ?? request.url}`,
            resource: 'http_request',
            actorId: request.user?.uid,
            ip: request.ip,
            userAgent: request.headers['user-agent'],
            requestId: request.headers['x-request-id'],
            payload: {
              method: request.method,
              url: request.url,
              traceId: request.headers['x-trace-id'],
              statusCode: response.statusCode,
              durationMs: Date.now() - startedAt
            }
          });
        }
      })
    );
  }
}
