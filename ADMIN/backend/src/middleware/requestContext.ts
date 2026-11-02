import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Attaches a unique request id and a best-effort client IP so operators can
 * correlate logs, audit entries and errors for a single request.
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  req.requestId = req.headers['x-request-id'] as string | undefined ?? randomUUID();
  req.requestIp =
    (req.ip ?? req.socket?.remoteAddress ?? 'unknown').replace('::ffff:', '') || 'unknown';
  res.setHeader('x-request-id', req.requestId);
  next();
}