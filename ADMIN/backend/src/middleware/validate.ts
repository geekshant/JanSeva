import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodType } from 'zod';
import { ApiError } from '../utils/ApiError';

/**
 * Validate request data against a zod schema before a controller runs.
 * Supports body, query, params and headers validation.
 */
export function validate(schema: {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query) as Request['query'];
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params) as Request['params'];
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          ApiError.badRequest(
            'Validation failed',
            'VALIDATION_ERROR',
            error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          ),
        );
        return;
      }
      next(error);
    }
  };
}