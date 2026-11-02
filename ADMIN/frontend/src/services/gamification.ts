import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient, paginate } from './base';
import type {
  BadgeRow,
  BadgeInsert,
  BadgeUpdate,
  UserBadgeRow,
  RewardRow,
  RewardRuleRow,
  RewardRuleInsert,
  RewardRuleUpdate,
  LevelConfigRow,
  LevelConfigInsert,
  LevelConfigUpdate,
  Paged,
  ListParams,
} from '@/types';

// ---------------------------------------------------------------------------
// Gamification service — badges, rewards, reward rules, level config.
// Works against existing tables: badges, user_badges, rewards, reward_rules,
// level_config.
// ---------------------------------------------------------------------------

// --- Badges ----------------------------------------------------------------

export async function listBadges(client?: SupabaseClient): Promise<BadgeRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('badges')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as BadgeRow[];
}

export async function createBadge(
  input: BadgeInsert,
  client?: SupabaseClient,
): Promise<BadgeRow> {
  const db = getClient(client);
  const { data, error } = await db.from('badges').insert(input).select().single();
  if (error) throw error;
  return data as BadgeRow;
}

export async function updateBadge(
  id: string,
  patch: BadgeUpdate,
  client?: SupabaseClient,
): Promise<BadgeRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('badges')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as BadgeRow;
}

export async function countBadgeHolders(
  badgeId: string,
  client?: SupabaseClient,
): Promise<number> {
  const db = getClient(client);
  const { count, error } = await db
    .from('user_badges')
    .select('*', { count: 'exact', head: true })
    .eq('badge_id', badgeId);
  if (error) throw error;
  return count ?? 0;
}

export async function listUserBadges(
  userId: string,
  client?: SupabaseClient,
): Promise<(UserBadgeRow & { badges: BadgeRow | null })[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('user_badges')
    .select('*, badges ( * )')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  if (error) throw error;
  return data as (UserBadgeRow & { badges: BadgeRow | null })[];
}

// --- Rewards ---------------------------------------------------------------

export interface ListRewardsParams extends ListParams {
  userId?: string;
}

export async function listRewards(
  params: ListRewardsParams = {},
  client?: SupabaseClient,
): Promise<Paged<RewardRow>> {
  const db = getClient(client);
  const { page, limit, rangeFrom, rangeTo } = paginate(params);

  let query = db
    .from('rewards')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo);

  if (params.userId) query = query.eq('user_id', params.userId);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: data ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
  };
}

// --- Reward Rules ----------------------------------------------------------

export async function listRewardRules(
  client?: SupabaseClient,
): Promise<RewardRuleRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('reward_rules')
    .select('*')
    .order('activity_type', { ascending: true });
  if (error) throw error;
  return data as RewardRuleRow[];
}

export async function createRewardRule(
  input: RewardRuleInsert,
  client?: SupabaseClient,
): Promise<RewardRuleRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('reward_rules')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as RewardRuleRow;
}

export async function updateRewardRule(
  activityType: string,
  patch: RewardRuleUpdate,
  client?: SupabaseClient,
): Promise<RewardRuleRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('reward_rules')
    .update(patch)
    .eq('activity_type', activityType)
    .select()
    .single();
  if (error) throw error;
  return data as RewardRuleRow;
}

// --- Level Config ----------------------------------------------------------

export async function listLevels(
  client?: SupabaseClient,
): Promise<LevelConfigRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('level_config')
    .select('*')
    .order('level', { ascending: true });
  if (error) throw error;
  return data as LevelConfigRow[];
}

// --- Leaderboard -----------------------------------------------------------

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar_url: string | null;
  points: number;
  level: number;
  ward: string | null;
  complaint_count: number;
}

export type LeaderboardScope = 'all_time' | 'monthly';

export async function getLeaderboard(
  scope: LeaderboardScope = 'all_time',
  ward?: string | null,
  limit = 50,
  client?: SupabaseClient,
): Promise<LeaderboardEntry[]> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_leaderboard', {
    p_scope: scope,
    p_ward: ward ?? null,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as unknown as LeaderboardEntry[];
}

/** Fetches unique wards from complaints for the leaderboard ward filter. */
export async function getLeaderboardWards(
  client?: SupabaseClient,
): Promise<string[]> {
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

export async function createLevel(
  input: LevelConfigInsert,
  client?: SupabaseClient,
): Promise<LevelConfigRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('level_config')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as LevelConfigRow;
}

export async function updateLevel(
  level: number,
  patch: LevelConfigUpdate,
  client?: SupabaseClient,
): Promise<LevelConfigRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('level_config')
    .update(patch)
    .eq('level', level)
    .select()
    .single();
  if (error) throw error;
  return data as LevelConfigRow;
}
