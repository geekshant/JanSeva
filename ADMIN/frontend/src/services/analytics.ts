import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './base';
import type {
  ComplaintStatus,
  ComplaintSeverity,
  AnalyticsSummary,
  TrendBucket,
  CategoryBreakdown,
  StatusBreakdown,
  SeverityBreakdown,
  HotZone,
  FullAnalytics,
  DepartmentAnalytics,
  WardAnalytics,
  CivicHealth,
} from '@/types';

// ---------------------------------------------------------------------------
// Analytics service — uses PostgreSQL RPC functions for all expensive
// aggregations. No client-side computation needed for summary stats.
// ---------------------------------------------------------------------------

// --- Summary (RPC) ---------------------------------------------------------

interface RawSummary {
  total: number;
  open: number;
  resolved: number;
  rejected: number;
  citizens: number;
  resolution_rate: number;
  avg_resolution_hours: number;
  median_resolution_hours: number;
  reopened_count: number;
  reopened_rate: number;
  escalation_count: number;
  escalation_rate: number;
  sla_on_track: number;
  sla_due_soon: number;
  sla_at_risk: number;
  sla_breached: number;
  sla_escalated: number;
  sla_resolved: number;
  sla_compliance_rate: number;
}

export async function getAnalyticsSummary(
  client?: SupabaseClient,
): Promise<AnalyticsSummary> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_analytics_summary');
  if (error) throw error;

  const raw = (data ?? []) as unknown as RawSummary[];
  const r = raw[0];
  if (!r) {
    return {
      total: 0, open: 0, resolved: 0, rejected: 0, citizens: 0,
      resolution_rate: 0, avg_resolution_hours: null, median_resolution_hours: null,
      reopened_count: 0, reopened_rate: 0, escalation_count: 0, escalation_rate: 0,
      sla: { on_track: 0, due_soon: 0, at_risk: 0, breached: 0, escalated: 0, resolved: 0 },
      sla_compliance_rate: 0,
    };
  }

  return {
    total: r.total,
    open: r.open,
    resolved: r.resolved,
    rejected: r.rejected,
    citizens: r.citizens,
    resolution_rate: Number(r.resolution_rate),
    avg_resolution_hours: r.avg_resolution_hours ? Number(r.avg_resolution_hours) : null,
    median_resolution_hours: r.median_resolution_hours ? Number(r.median_resolution_hours) : null,
    reopened_count: r.reopened_count,
    reopened_rate: Number(r.reopened_rate),
    escalation_count: r.escalation_count,
    escalation_rate: Number(r.escalation_rate),
    sla: {
      on_track: r.sla_on_track,
      due_soon: r.sla_due_soon,
      at_risk: r.sla_at_risk,
      breached: r.sla_breached,
      escalated: r.sla_escalated,
      resolved: r.sla_resolved,
    },
    sla_compliance_rate: Number(r.sla_compliance_rate),
  };
}

// --- Trends (still client-side — simple date bucketing) --------------------

export async function getTrends(
  days = 30,
  client?: SupabaseClient,
): Promise<TrendBucket[]> {
  const db = getClient(client);
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: allRows, error } = await db
    .from('complaints')
    .select('created_at, resolved_at, status')
    .gte('created_at', from)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const buckets = new Map<string, { submitted: number; resolved: number }>();
  for (const row of allRows ?? []) {
    const day = row.created_at.slice(0, 10);
    if (!buckets.has(day)) buckets.set(day, { submitted: 0, resolved: 0 });
    buckets.get(day)!.submitted++;

    if (row.status === 'RESOLVED' && row.resolved_at) {
      const rDay = row.resolved_at.slice(0, 10);
      if (!buckets.has(rDay)) buckets.set(rDay, { submitted: 0, resolved: 0 });
      buckets.get(rDay)!.resolved++;
    }
  }

  const result: TrendBucket[] = [];
  const start = new Date(from.slice(0, 10));
  const end = new Date(new Date().toISOString().slice(0, 10));
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    const b = buckets.get(day) ?? { submitted: 0, resolved: 0 };
    result.push({ date: day, submitted: b.submitted, resolved: b.resolved });
  }

  return result;
}

// --- Breakdowns (client-side — small datasets) -----------------------------

export async function getByCategory(
  client?: SupabaseClient,
): Promise<CategoryBreakdown[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('complaints')
    .select('categories!inner ( name )');
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const name = (row.categories as unknown as { name: string }).name;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getByStatus(
  client?: SupabaseClient,
): Promise<StatusBreakdown[]> {
  const db = getClient(client);
  const { data, error } = await db.from('complaints').select('status');
  if (error) throw error;

  const counts = new Map<ComplaintStatus, number>();
  for (const row of data ?? []) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
}

export async function getBySeverity(
  client?: SupabaseClient,
): Promise<SeverityBreakdown[]> {
  const db = getClient(client);
  const { data, error } = await db.from('complaints').select('severity');
  if (error) throw error;

  const counts = new Map<ComplaintSeverity, number>();
  for (const row of data ?? []) {
    counts.set(row.severity, (counts.get(row.severity) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([severity, count]) => ({ severity, count }));
}

// --- Hot zones (PostGIS RPC) -----------------------------------------------

export async function getHotZones(
  client?: SupabaseClient,
): Promise<HotZone[]> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_hot_zones', {
    p_grid_size: 0.01,
    p_limit: 10,
  });
  if (error) throw error;
  return (data ?? []) as unknown as HotZone[];
}

// --- Department analytics (RPC) --------------------------------------------

export async function getDepartmentAnalytics(
  client?: SupabaseClient,
): Promise<DepartmentAnalytics[]> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_department_analytics');
  if (error) throw error;
  return (data ?? []) as unknown as DepartmentAnalytics[];
}

// --- Ward analytics (RPC) --------------------------------------------------

export async function getWardAnalytics(
  client?: SupabaseClient,
): Promise<WardAnalytics[]> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_ward_analytics');
  if (error) throw error;
  return (data ?? []) as unknown as WardAnalytics[];
}

// --- Civic health (RPC + simple queries) ------------------------------------

export async function getCivicHealth(
  client?: SupabaseClient,
): Promise<CivicHealth> {
  const db = getClient(client);

  // Total citizens — use the count_citizens RPC which excludes officers.
  const { data: citizenCount, error: cErr } = await db
    .rpc('count_citizens', { p_search: null, p_suspended_only: false });
  if (cErr) throw cErr;
  const totalCitizens = (citizenCount as number) ?? 0;

  // Active citizens — distinct complaint authors who are NOT officers.
  const { data: officerRows, error: oErr } = await db
    .from('officers')
    .select('profile_id')
    .is('deleted_at', null);
  if (oErr) throw oErr;
  const officerIds = new Set(
    (officerRows ?? []).map((r: { profile_id: string }) => r.profile_id),
  );

  const { data: activeUsers, error: aErr } = await db
    .from('complaints')
    .select('user_id');
  if (aErr) throw aErr;

  const activeCitizenIds = new Set(
    (activeUsers ?? [])
      .map((r: { user_id: string }) => r.user_id)
      .filter((id) => !officerIds.has(id)),
  );

  const { data: statuses, error: sErr } = await db
    .from('complaints')
    .select('status');
  if (sErr) throw sErr;

  let total = 0;
  let resolved = 0;
  for (const row of statuses ?? []) {
    total++;
    if (row.status === 'RESOLVED') resolved++;
  }

  const resolutionRate = total > 0 ? Math.round((resolved / total) * 1000) / 10 : 0;
  const engagementRate = (totalCitizens ?? 0) > 0
    ? Math.round((activeCitizenIds.size / (totalCitizens ?? 1)) * 1000) / 10
    : 0;

  const healthScore = Math.round((resolutionRate * 0.6 + engagementRate * 0.4));

  return {
    total_citizens: totalCitizens ?? 0,
    active_citizens: activeCitizenIds.size,
    total_complaints: total,
    resolution_rate: resolutionRate,
    avg_resolution_hours: null,
    engagement_rate: engagementRate,
    civic_health_score: healthScore,
  };
}

// --- AI analytics (RPC) -----------------------------------------------------

export interface AiAnalytics {
  total_analyzed: number;
  ai_verified: number;
  ai_failed: number;
  ai_review_required: number;
  ai_evidence_required: number;
  ai_success_rate: number;
  ai_analysis_pending: number;
  ai_analysis_error: number;
}

export async function getAiAnalytics(
  client?: SupabaseClient,
): Promise<AiAnalytics> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_ai_analytics');
  if (error) throw error;
  const r = (data as unknown as AiAnalytics[])[0];
  return r ?? {
    total_analyzed: 0, ai_verified: 0, ai_failed: 0, ai_review_required: 0,
    ai_evidence_required: 0, ai_success_rate: 0, ai_analysis_pending: 0, ai_analysis_error: 0,
  };
}

// --- Full analytics (all in parallel) ---------------------------------------

export async function getFullAnalytics(
  days = 30,
  client?: SupabaseClient,
): Promise<FullAnalytics> {
  const [summary, by_category, by_status, by_severity, trends, hot_zones] =
    await Promise.all([
      getAnalyticsSummary(client),
      getByCategory(client),
      getByStatus(client),
      getBySeverity(client),
      getTrends(days, client),
      getHotZones(client),
    ]);

  return { summary, by_category, by_status, by_severity, trends, hot_zones };
}

// --- Legacy aliases (for backward compatibility with existing hooks) --------

export { getDepartmentAnalytics as getDepartmentStats };
export { getWardAnalytics as getWardStats };

// Legacy types (re-exported for backward compat)
export type { DepartmentAnalytics as DepartmentStat };
export type { WardAnalytics as WardStat };
