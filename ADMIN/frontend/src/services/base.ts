import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Paged, ListParams } from '@/types';

// ---------------------------------------------------------------------------
// Shared service helpers — error extraction, pagination, query building.
// All service modules use these so error handling stays consistent.
// ---------------------------------------------------------------------------

/** Extracts a human-readable message from a Supabase error. */
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'An unexpected error occurred.';
}

/** Wraps a Supabase query call — throws on error, returns data on success. */
export async function unwrap<T>(
  promise: Promise<{ data: T | null; error: unknown }>,
): Promise<T> {
  const { data, error } = await promise;
  if (error) throw error;
  return data as T;
}

/** Wraps a Supabase write call — throws on error, returns data (or null). */
export async function unwrapOrNull<T>(
  promise: Promise<{ data: T | null; error: unknown }>,
): Promise<T | null> {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

/** Wraps a Supabase count call — throws on error, returns count. */
export async function unwrapCount(
  promise: Promise<{ count: number | null; error: unknown }>,
): Promise<number> {
  const { count, error } = await promise;
  if (error) throw error;
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Pagination helpers
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  page: number;
  limit: number;
  rangeFrom: number;
  rangeTo: number;
}

export function paginate(params: ListParams): PaginationMeta {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  return {
    page,
    limit,
    rangeFrom: (page - 1) * limit,
    rangeTo: page * limit - 1,
  };
}

export function totalPages(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / limit));
}

/** Builds a `Paged<T>` result from raw rows + a total count. */
export function buildPage<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): Paged<T> {
  return { data, total, page, limit, totalPages: totalPages(total, limit) };
}

// ---------------------------------------------------------------------------
// Typed client accessor — lets tests inject a mock client.
// ---------------------------------------------------------------------------

export function getClient(client?: SupabaseClient): SupabaseClient {
  return client ?? supabase;
}
