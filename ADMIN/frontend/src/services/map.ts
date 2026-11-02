import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './base';
import type { MapComplaint, MapBounds, MapFilters } from '@/types/map';

// ---------------------------------------------------------------------------
// Map service — spatial queries via PostGIS RPC functions.
//
// Uses the `get_map_complaints` and `get_map_complaints_count` RPC functions
// created in the database. These use PostGIS ST_Intersects for bounding-box
// filtering and respect RLS (SECURITY INVOKER).
//
// The RPC approach avoids loading all complaints into the browser — only
// complaints within the current map viewport are fetched, with pagination.
// ---------------------------------------------------------------------------

export interface MapQueryParams {
  bounds: MapBounds;
  filters: MapFilters;
  limit?: number;
  offset?: number;
}

export interface MapQueryResult {
  complaints: MapComplaint[];
  total: number;
}

export async function getMapComplaints(
  params: MapQueryParams,
  client?: SupabaseClient,
): Promise<MapQueryResult> {
  const db = getClient(client);
  const { bounds, filters, limit = 500, offset = 0 } = params;

  const { data, error } = await db.rpc('get_map_complaints', {
    p_west: bounds.west,
    p_south: bounds.south,
    p_east: bounds.east,
    p_north: bounds.north,
    p_status: filters.status || null,
    p_severity: filters.severity || null,
    p_category_id: filters.categoryId || null,
    p_department_id: filters.departmentId || null,
    p_ward: filters.ward || null,
    p_sla: filters.sla === 'all' ? null : filters.sla,
    p_date_from: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : null,
    p_date_to: filters.dateTo ? new Date(filters.dateTo).toISOString() : null,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;
  const complaints = (data ?? []) as unknown as MapComplaint[];

  const total = await getMapComplaintsCount(bounds, filters, client);

  return { complaints, total };
}

export async function getMapComplaintsCount(
  bounds: MapBounds,
  filters: MapFilters,
  client?: SupabaseClient,
): Promise<number> {
  const db = getClient(client);

  const { data, error } = await db.rpc('get_map_complaints_count', {
    p_west: bounds.west,
    p_south: bounds.south,
    p_east: bounds.east,
    p_north: bounds.north,
    p_status: filters.status || null,
    p_severity: filters.severity || null,
    p_category_id: filters.categoryId || null,
    p_department_id: filters.departmentId || null,
    p_ward: filters.ward || null,
    p_sla: filters.sla === 'all' ? null : filters.sla,
    p_date_from: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : null,
    p_date_to: filters.dateTo ? new Date(filters.dateTo).toISOString() : null,
  });

  if (error) throw error;
  return (data as unknown as number) ?? 0;
}

/** Fetches unique wards from complaints (for the ward filter dropdown). */
export async function getUniqueWards(client?: SupabaseClient): Promise<string[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('complaints')
    .select('ward')
    .not('ward', 'is', null)
    .neq('ward', '');

  if (error) throw error;

  const wards = (data ?? [])
    .map((r) => (r as { ward: string }).ward)
    .filter(Boolean);
  return [...new Set(wards)].sort();
}
