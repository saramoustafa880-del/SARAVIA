import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : { message: 'Internal server error' };

    this.logger.error(
      `HTTP ${status} ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : JSON.stringify(payload)
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url,
      requestId: request.headers['x-request-id'] ?? null,
      error: payload,
      timestamp: new Date().toISOString()
    });
  }
}
