import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

/**
 * Writes an immutable audit log row for privileged, state-changing operations
 * (status transitions, assignments, moderation, role changes). Runs after the
 * response is sent so it never adds latency to the caller.
 */
export function writeAudit(req: Request, entry: AuditEntry, res: Response): void {
  res.on('finish', () => {
    void prisma.auditLog
      .create({
        data: {
          actorId: req.user?.userId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          before: (entry.before as object | undefined) ?? undefined,
          after: (entry.after as object | undefined) ?? undefined,
          ip: req.requestIp,
          userAgent: req.get('user-agent')?.slice(0, 255),
        },
      })
      .catch(() => {
        // Audit failures must never break the request flow.
      });
  });
}

/** Convenience middleware wrapper matching Express handler shape. */
export function auditMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next();
}