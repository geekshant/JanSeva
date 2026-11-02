import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './base';
import { logAudit } from './audit';
import type {
  ProfileRow,
  ProfileUpdate,
  Paged,
  ListParams,
  CitizenStats,
  CitizenBadge,
  RewardRow,
  ComplaintRow,
  Json,
} from '@/types';

// ---------------------------------------------------------------------------
// Users / Profiles service — citizen profile management.
//
// Authoritative gamification values (points, level) are READ-ONLY from the
// admin UI. They are managed by database triggers (handle_complaint_report_points,
// apply_status_rewards) based on the reward_rules table. Admins can view but
// NOT directly edit points or levels.
// ---------------------------------------------------------------------------

export interface ListUsersParams extends ListParams {
  search?: string;
  minLevel?: number;
  minPoints?: number;
  suspendedOnly?: boolean;
}

export async function listProfiles(
  params: ListUsersParams = {},
  client?: SupabaseClient,
): Promise<Paged<ProfileRow>> {
  const db = getClient(client);

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));

  const { data, error } = await db.rpc('list_citizens', {
    p_search: params.search || null,
    p_page: page,
    p_limit: limit,
    p_suspended_only: params.suspendedOnly ?? false,
  });
  if (error) throw error;

  const { data: countData, error: countError } = await db.rpc('count_citizens', {
    p_search: params.search || null,
    p_suspended_only: params.suspendedOnly ?? false,
  });
  if (countError) throw countError;

  const profiles = (data ?? []) as unknown as ProfileRow[];

  // PostgREST returns scalar RPC results as an array with one object, e.g. [{count: 5}]
  let total = 0;
  if (countData !== null) {
    if (Array.isArray(countData) && countData.length > 0) {
      const first = countData[0] as Record<string, unknown>;
      if (first && typeof first === 'object' && 'count' in first) {
        total = Number(first.count);
      } else if (typeof first === 'number') {
        total = first;
      }
    } else if (typeof countData === 'number') {
      total = countData;
    }
  }

  return {
    data: profiles,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getProfile(
  id: string,
  client?: SupabaseClient,
): Promise<ProfileRow | null> {
  const db = getClient(client);
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as ProfileRow | null;
}

/**
 * Updates a citizen profile.
 * NOTE: This is intentionally restricted — admins may NOT edit authoritative
 * gamification values (points, level) directly. The `patch` is filtered to
 * only allow suspension-related fields. Name/email/phone/avatar changes
 * are the citizen's own responsibility.
 */
export async function updateProfile(
  id: string,
  patch: ProfileUpdate,
  client?: SupabaseClient,
): Promise<ProfileRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ProfileRow;
}

export async function countCitizens(client?: SupabaseClient): Promise<number> {
  const db = getClient(client);
  const { data, error } = await db.rpc('count_citizens', {
    p_search: null,
    p_suspended_only: false,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function getLeaderboard(
  limit = 10,
  client?: SupabaseClient,
): Promise<ProfileRow[]> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_leaderboard', {
    p_scope: 'all_time',
    p_ward: null,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as unknown as ProfileRow[];
}

// ---------------------------------------------------------------------------
// Citizen management actions — suspend / restore
// ---------------------------------------------------------------------------

export async function suspendCitizen(
  id: string,
  reason: string,
  suspendedBy: string | null = null,
  client?: SupabaseClient,
): Promise<ProfileRow> {
  const db = getClient(client);

  // Get the current state for the audit log "before" field.
  const { data: before } = await db
    .from('profiles')
    .select('is_suspended')
    .eq('id', id)
    .single();

  const patch: ProfileUpdate = {
    is_suspended: true,
    suspended_at: new Date().toISOString(),
    suspended_by: suspendedBy,
    suspension_reason: reason,
  };

  const { data, error } = await db
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  await logAudit(
    {
      actor_id: suspendedBy,
      action: 'USER_SUSPENDED',
      entity_type: 'citizen',
      entity_id: id,
      before: (before ?? null) as unknown as Json,
      after: { is_suspended: true, reason } as unknown as Json,
    },
    client,
  );

  return data as ProfileRow;
}

export async function restoreCitizen(
  id: string,
  restoredBy: string | null = null,
  client?: SupabaseClient,
): Promise<ProfileRow> {
  const db = getClient(client);

  const { data: before } = await db
    .from('profiles')
    .select('is_suspended, suspension_reason')
    .eq('id', id)
    .single();

  const patch: ProfileUpdate = {
    is_suspended: false,
    suspended_at: null,
    suspended_by: null,
    suspension_reason: null,
  };

  const { data, error } = await db
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  await logAudit(
    {
      actor_id: restoredBy,
      action: 'USER_RESTORED',
      entity_type: 'citizen',
      entity_id: id,
      before: (before ?? null) as unknown as Json,
      after: { is_suspended: false } as unknown as Json,
    },
    client,
  );

  return data as ProfileRow;
}

// ---------------------------------------------------------------------------
// Citizen stats + badges + rewards + complaints (read-only)
// ---------------------------------------------------------------------------

export async function getCitizenStats(
  userId: string,
  client?: SupabaseClient,
): Promise<CitizenStats> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_citizen_stats', { p_user_id: userId });
  if (error) throw error;
  return (data ?? {
    total_complaints: 0,
    verified_reports: 0,
    resolved_reports: 0,
    rejected_reports: 0,
    badge_count: 0,
    reward_count: 0,
    total_points: 0,
  }) as CitizenStats;
}

export async function getCitizenBadges(
  userId: string,
  client?: SupabaseClient,
): Promise<CitizenBadge[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('user_badges')
    .select(
      `
      *,
      badges ( id, name, description, icon )
    `,
    )
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CitizenBadge[];
}

export async function getCitizenRewards(
  userId: string,
  limit = 20,
  client?: SupabaseClient,
): Promise<RewardRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('rewards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as RewardRow[];
}

export async function getCitizenComplaints(
  userId: string,
  limit = 10,
  client?: SupabaseClient,
): Promise<ComplaintRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('complaints')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ComplaintRow[];
}
