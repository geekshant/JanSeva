import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient, paginate } from './base';
import type {
  NotificationRow,
  NotificationUpdate,
  Paged,
  ListParams,
} from '@/types';

// ---------------------------------------------------------------------------
// Notifications service — list, mark read/unread.
// Works against the existing `notifications` table.
// ---------------------------------------------------------------------------

export interface ListNotificationsParams extends ListParams {
  unreadOnly?: boolean;
}

export async function listNotifications(
  params: ListNotificationsParams = {},
  client?: SupabaseClient,
): Promise<Paged<NotificationRow>> {
  const db = getClient(client);
  const { page, limit, rangeFrom, rangeTo } = paginate(params);

  let query = db
    .from('notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo);

  if (params.unreadOnly) query = query.eq('is_read', false);

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

export async function markNotificationRead(
  id: string,
  client?: SupabaseClient,
): Promise<NotificationRow> {
  const db = getClient(client);
  const patch: NotificationUpdate = {
    is_read: true,
    read_at: new Date().toISOString(),
  };
  const { data, error } = await db
    .from('notifications')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as NotificationRow;
}

export async function markAllNotificationsRead(
  userId: string,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  const patch: NotificationUpdate = {
    is_read: true,
    read_at: new Date().toISOString(),
  };
  const { error } = await db
    .from('notifications')
    .update(patch)
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

export async function getUnreadCount(
  userId: string,
  client?: SupabaseClient,
): Promise<number> {
  const db = getClient(client);
  const { count, error } = await db
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function getNotification(
  id: string,
  client?: SupabaseClient,
): Promise<NotificationRow | null> {
  const db = getClient(client);
  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as NotificationRow | null;
}
