import crypto from 'crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = String(req.headers['x-request-id'] ?? crypto.randomUUID());
    const traceId = String(req.headers['x-trace-id'] ?? crypto.randomUUID().replace(/-/g, ''));

    req.headers['x-request-id'] = requestId;
    req.headers['x-trace-id'] = traceId;
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-trace-id', traceId);
    next();
  }
}
