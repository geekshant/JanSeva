/**
 * Standard application error carrying an HTTP status code and a machine-
 * readable code so the dashboard and mobile app can handle failures uniformly.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
    isOperational = true,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown): ApiError {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED'): ApiError {
    return new ApiError(401, code, message);
  }

  static forbidden(message = 'Insufficient permissions', code = 'FORBIDDEN'): ApiError {
    return new ApiError(403, code, message);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND'): ApiError {
    return new ApiError(404, code, message);
  }

  static conflict(message: string, code = 'CONFLICT'): ApiError {
    return new ApiError(409, code, message);
  }

  static tooManyRequests(
    message = 'Too many requests',
    code = 'RATE_LIMITED',
  ): ApiError {
    return new ApiError(429, code, message);
  }

  static serviceUnavailable(message: string, code = 'SERVICE_UNAVAILABLE'): ApiError {
    return new ApiError(503, code, message);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}