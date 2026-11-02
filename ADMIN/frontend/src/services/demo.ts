import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './base';

// ---------------------------------------------------------------------------
// Demo Mode service — toggle and drive the automated complaint workflow.
// ---------------------------------------------------------------------------

/** Check if demo mode is currently enabled. */
export async function isDemoMode(client?: SupabaseClient): Promise<boolean> {
  const db = getClient(client);
  const { data, error } = await db.rpc('is_demo_mode');
  if (error) throw error;
  return (data as boolean) ?? false;
}

/** Enable or disable demo mode. */
export async function toggleDemoMode(
  enabled: boolean,
  client?: SupabaseClient,
): Promise<boolean> {
  const db = getClient(client);
  const { data, error } = await db.rpc('toggle_demo_mode', { p_enabled: enabled });
  if (error) throw error;
  return (data as boolean) ?? false;
}

/** Seed 15 dummy complaints across Bhopal (one-time setup). Returns count inserted. */
export async function seedDemoComplaints(client?: SupabaseClient): Promise<number> {
  const db = getClient(client);
  const { data, error } = await db.rpc('seed_demo_complaints');
  if (error) throw error;
  return (data as number) ?? 0;
}

/** Advance demo complaints by one workflow step + occasionally create new ones. */
export async function advanceDemoComplaints(client?: SupabaseClient): Promise<number> {
  const db = getClient(client);
  const { data, error } = await db.rpc('advance_demo_complaints');
  if (error) throw error;
  return (data as number) ?? 0;
}
