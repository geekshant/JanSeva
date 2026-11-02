import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './base';
import { logAudit } from './audit';
import type { NotificationConfigRow, NotificationConfigUpdate, Json } from '@/types';

// ---------------------------------------------------------------------------
// Notification config service — admin-managed event-type preferences.
// Controls whether each event type generates in-app and/or push notifications.
// All changes are audited.
// ---------------------------------------------------------------------------

export async function listNotificationConfigs(
  client?: SupabaseClient,
): Promise<NotificationConfigRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('notification_config')
    .select('*')
    .order('label', { ascending: true });
  if (error) throw error;
  return data as NotificationConfigRow[];
}

export async function updateNotificationConfig(
  id: string,
  patch: NotificationConfigUpdate,
  actorId: string | null = null,
  client?: SupabaseClient,
): Promise<NotificationConfigRow> {
  const db = getClient(client);
  const { data: before } = await db
    .from('notification_config')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await db
    .from('notification_config')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  const config = data as NotificationConfigRow;

  await logAudit(
    {
      actor_id: actorId,
      action: 'NOTIFICATION_CONFIG_UPDATED',
      entity_type: 'notification_config',
      entity_id: id,
      before: (before ?? null) as unknown as Json,
      after: patch as unknown as Json,
    },
    client,
  );

  return config;
}
