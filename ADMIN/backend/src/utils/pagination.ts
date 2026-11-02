export interface PaginationQuery {
  page: number;
  limit: number;
  skip: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse and clamp ?page & ?limit query params. List endpoints must be
 * paginated and return the shared ApiMeta envelope.
 */
export function getPagination(query: Record<string, unknown>): PaginationQuery {
  const rawPage = Number(query.page ?? 1);
  const rawLimit = Number(query.limit ?? DEFAULT_LIMIT);

  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;

  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(total: number, page: number, limit: number) {
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    pages,
    hasNextPage: page < pages,
    hasPrevPage: page > 1,
  };
}