import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuditLogInput {
  action: string;
  resource: string;
  resourceId?: string | null;
  actorId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  payload?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    this.logger.log(JSON.stringify(input));

    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? undefined,
        actorId: input.actorId ?? undefined,
        ip: input.ip ?? undefined,
        userAgent: input.userAgent ?? undefined,
        requestId: input.requestId ?? undefined,
        payload: input.payload
      }
    });
  }
}
