/**
 * Unified success envelope. Every success response shapes as
 * { success, message, data, meta } where meta holds pagination info.
 */
export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export class ApiResponse<T> {
  public readonly success: true;
  public readonly data: T;
  public readonly message?: string;
  public readonly meta?: ApiMeta;

  constructor(data: T, message?: string, meta?: ApiMeta) {
    this.success = true;
    this.data = data;
    this.message = message;
    this.meta = meta;
  }

  static ok<T>(data: T, message = 'OK'): ApiResponse<T> {
    return new ApiResponse<T>(data, message);
  }

  static paginated<T>(
    data: T,
    meta: ApiMeta,
    message = 'OK',
  ): ApiResponse<T> {
    return new ApiResponse<T>(data, message, meta);
  }
}