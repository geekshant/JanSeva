import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { isApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

/**
 * Central error handler. Translates zod/prisma errors into the shared
 * error envelope: { success:false, error:{ code, message, details } }.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (isApiError(err)) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: { code: 'UNIQUE_CONSTRAINT', message: 'A record with that value already exists' },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'The requested record does not exist' },
      });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Invalid data supplied to the store' },
    });
    return;
  }

  logger.error({ err, url: req.originalUrl, method: req.method }, 'Unhandled request error');
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` },
  });
}