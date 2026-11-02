import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './base';
import { logAudit } from './audit';
import type { CategoryRow, CategoryInsert, CategoryUpdate, Json } from '@/types';

// ---------------------------------------------------------------------------
// Categories service — fetches complaint categories from Supabase.
// Never hardcode category names — always read from the database.
// All mutations are audited.
// ---------------------------------------------------------------------------

export async function listCategories(
  client?: SupabaseClient,
): Promise<CategoryRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('categories')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data as CategoryRow[];
}

export async function listActiveCategories(
  client?: SupabaseClient,
): Promise<CategoryRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('categories')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return data as CategoryRow[];
}

export async function createCategory(
  input: CategoryInsert,
  actorId: string | null = null,
  client?: SupabaseClient,
): Promise<CategoryRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('categories')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  const category = data as CategoryRow;
  await logAudit(
    {
      actor_id: actorId,
      action: 'CATEGORY_CREATED',
      entity_type: 'category',
      entity_id: category.id,
      before: null,
      after: { name: category.name, icon: category.icon } as unknown as Json,
    },
    client,
  );
  return category;
}

export async function updateCategory(
  id: string,
  patch: CategoryUpdate,
  actorId: string | null = null,
  client?: SupabaseClient,
): Promise<CategoryRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('categories')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  const category = data as CategoryRow;
  const action = patch.active === false ? 'CATEGORY_UPDATED' : 'CATEGORY_UPDATED';
  await logAudit(
    {
      actor_id: actorId,
      action,
      entity_type: 'category',
      entity_id: id,
      before: null,
      after: patch as unknown as Json,
    },
    client,
  );
  return category;
}
