import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ApiError } from './ApiError';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async controller and forwards rejected promises to the error
 * middleware, keeping Express 4 from swallowing them.
 */
export function asyncHandler(fn: AsyncHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function assertExists<T>(value: T | null | undefined, message?: string): T {
  if (value === null || value === undefined) {
    throw ApiError.notFound(message);
  }
  return value;
}