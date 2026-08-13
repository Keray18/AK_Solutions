import type { PaginationMeta, PaginationQuery } from '../types/api.types.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse and normalize pagination query parameters.
 */
export function parsePagination(query: PaginationQuery) {
  const page = Math.max(1, query.page ?? DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
    sortBy: query.sortBy ?? 'created_at',
    sortOrder: query.sortOrder ?? 'desc' as const,
  };
}

/**
 * Build pagination metadata from a total count.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
