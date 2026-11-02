import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient, paginate, buildPage } from './base';
import { logAudit } from './audit';
import type {
  CivicIncidentRow,
  CivicIncidentInsert,
  CivicIncidentUpdate,
  CivicIncidentWithRelations,
  DuplicateLinkRow,
  DuplicateLinkInsert,
  ComplaintImageRow,
  ComplaintWithRelations,
  Paged,
  ListParams,
  Json,
} from '@/types';

// ---------------------------------------------------------------------------
// Civic Incidents service — group complaints about the same real-world problem.
//
// Admins can:
//   - Create incidents
//   - Link/unlink complaints to incidents
//   - Mark complaints as duplicates
//   - Merge duplicate complaints
//   - View incident timeline, affected area, evidence
//
// Merging is NOT automatic — it requires explicit admin review.
// ---------------------------------------------------------------------------

export interface ListIncidentsParams extends ListParams {
  search?: string;
  status?: CivicIncidentRow['status'];
  categoryId?: string;
  departmentId?: string;
  ward?: string;
}

export async function listIncidents(
  params: ListIncidentsParams = {},
  client?: SupabaseClient,
): Promise<Paged<CivicIncidentWithRelations>> {
  const db = getClient(client);
  const { page, limit, rangeFrom, rangeTo } = paginate(params);

  let query = db
    .from('civic_incidents')
    .select(
      `
      *,
      categories ( id, name ),
      departments ( id, name, code )
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo);

  if (params.search) {
    query = query.or(
      `title.ilike.%${params.search}%,incident_number.ilike.%${params.search}%`,
    );
  }
  if (params.status) query = query.eq('status', params.status);
  if (params.categoryId) query = query.eq('category_id', params.categoryId);
  if (params.departmentId) query = query.eq('assigned_department_id', params.departmentId);
  if (params.ward) query = query.eq('ward', params.ward);

  const { data, count, error } = await query;
  if (error) throw error;

  return buildPage(
    (data ?? []) as unknown as CivicIncidentWithRelations[],
    count ?? 0,
    page,
    limit,
  );
}

export async function getIncident(
  id: string,
  client?: SupabaseClient,
): Promise<CivicIncidentWithRelations | null> {
  const db = getClient(client);
  const { data, error } = await db
    .from('civic_incidents')
    .select(
      `
      *,
      categories ( id, name ),
      departments ( id, name, code )
    `,
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as CivicIncidentWithRelations | null;
}

export async function createIncident(
  input: CivicIncidentInsert,
  client?: SupabaseClient,
): Promise<CivicIncidentRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('civic_incidents')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as CivicIncidentRow;
}

export async function updateIncident(
  id: string,
  patch: CivicIncidentUpdate,
  client?: SupabaseClient,
): Promise<CivicIncidentRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('civic_incidents')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as CivicIncidentRow;
}

// --- Link / Unlink complaints -----------------------------------------------

export async function linkComplaintToIncident(
  complaintId: string,
  incidentId: string,
  linkType: 'original' | 'duplicate' = 'original',
  linkedBy: string | null = null,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);

  // Insert the duplicate_link record.
  const { error: linkError } = await db.from('duplicate_links').insert({
    complaint_id: complaintId,
    incident_id: incidentId,
    link_type: linkType,
    linked_by: linkedBy,
  });
  if (linkError) throw linkError;

  // Set incident_id on the complaint.
  const { error: updError } = await db
    .from('complaints')
    .update({ incident_id: incidentId })
    .eq('id', complaintId);
  if (updError) throw updError;

  // Recalculate incident stats.
  await recalculateIncidentStats(incidentId, client);

  await logAudit(
    {
      actor_id: linkedBy,
      action: 'COMPLAINT_ASSIGNED',
      entity_type: 'incident',
      entity_id: incidentId,
      before: null,
      after: { complaint_id: complaintId, link_type: linkType } as unknown as Json,
    },
    client,
  );
}

export async function unlinkComplaintFromIncident(
  complaintId: string,
  incidentId: string,
  unlinkedBy: string | null = null,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);

  const { error: delError } = await db
    .from('duplicate_links')
    .delete()
    .eq('complaint_id', complaintId)
    .eq('incident_id', incidentId);
  if (delError) throw delError;

  const { error: updError } = await db
    .from('complaints')
    .update({ incident_id: null })
    .eq('id', complaintId);
  if (updError) throw updError;

  await recalculateIncidentStats(incidentId, client);

  await logAudit(
    {
      actor_id: unlinkedBy,
      action: 'COMPLAINT_STATUS_CHANGED',
      entity_type: 'incident',
      entity_id: incidentId,
      before: { complaint_id: complaintId } as unknown as Json,
      after: { unlinked: true } as unknown as Json,
    },
    client,
  );
}

// --- Merge complaints -------------------------------------------------------

/**
 * Marks a complaint as a duplicate of the primary complaint in an incident.
 * This does NOT delete or modify the complaint — it only sets the link_type
 * to 'duplicate' and updates the incident stats.
 */
export async function markAsDuplicate(
  complaintId: string,
  incidentId: string,
  adminId: string | null = null,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);

  const { error } = await db
    .from('duplicate_links')
    .update({ link_type: 'duplicate' })
    .eq('complaint_id', complaintId)
    .eq('incident_id', incidentId);
  if (error) throw error;

  await recalculateIncidentStats(incidentId, client);

  await logAudit(
    {
      actor_id: adminId,
      action: 'COMPLAINT_STATUS_CHANGED',
      entity_type: 'incident',
      entity_id: incidentId,
      before: { complaint_id: complaintId, link_type: 'original' } as unknown as Json,
      after: { complaint_id: complaintId, link_type: 'duplicate' } as unknown as Json,
    },
    client,
  );
}

/**
 * Merges one incident into another. All complaints linked to [sourceIncidentId]
 * are moved to [targetIncidentId]; their `duplicate_links` rows are re-pointed
 * (link_type set to 'merged' for the moved ones) and the source incident is
 * marked as 'merged' status. The source incident is NOT deleted — it remains
 * for audit/timeline purposes.
 *
 * This is a safe, admin-reviewed action — no automatic merging is performed
 * without this explicit call.
 */
export async function mergeIncidents(
  sourceIncidentId: string,
  targetIncidentId: string,
  adminId: string | null = null,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);

  // Fetch all complaint_ids linked to the source incident.
  const { data: sourceLinks, error: fetchErr } = await db
    .from('duplicate_links')
    .select('complaint_id')
    .eq('incident_id', sourceIncidentId);
  if (fetchErr) throw fetchErr;

  const complaintIds = (sourceLinks ?? []).map(
    (r: { complaint_id: string }) => r.complaint_id,
  );

  if (complaintIds.length > 0) {
    // Move each complaint to the target incident. We delete the old
    // duplicate_link row and insert a new one pointing at the target,
    // with link_type='merged' to preserve the audit trail. The unique
    // constraint (complaint_id, incident_id) prevents conflicts since
    // we delete from the source first.
    for (const complaintId of complaintIds) {
      // Check if this complaint is already linked to the target incident
      // (edge case: complaint was linked to both before merge).
      const { data: existing } = await db
        .from('duplicate_links')
        .select('id')
        .eq('complaint_id', complaintId)
        .eq('incident_id', targetIncidentId)
        .maybeSingle();

      if (existing) {
        // Already linked to target — just remove the source link.
        await db
          .from('duplicate_links')
          .delete()
          .eq('complaint_id', complaintId)
          .eq('incident_id', sourceIncidentId);
      } else {
        // Re-point: delete source link, insert target link as 'merged'.
        await db
          .from('duplicate_links')
          .delete()
          .eq('complaint_id', complaintId)
          .eq('incident_id', sourceIncidentId);

        const linkInsert: DuplicateLinkInsert = {
          complaint_id: complaintId,
          incident_id: targetIncidentId,
          link_type: 'merged',
          linked_by: adminId,
        };
        await db.from('duplicate_links').insert(linkInsert);
      }

      // Update the complaint's incident_id pointer.
      await db
        .from('complaints')
        .update({ incident_id: targetIncidentId })
        .eq('id', complaintId);
    }
  }

  // Mark the source incident as merged.
  await db
    .from('civic_incidents')
    .update({ status: 'merged', updated_at: new Date().toISOString() })
    .eq('id', sourceIncidentId);

  // Recalculate stats for both incidents.
  await recalculateIncidentStats(targetIncidentId, client);
  await recalculateIncidentStats(sourceIncidentId, client);

  await logAudit(
    {
      actor_id: adminId,
      action: 'COMPLAINT_ASSIGNED',
      entity_type: 'incident',
      entity_id: targetIncidentId,
      before: { merged_from: sourceIncidentId, complaint_count: complaintIds.length } as unknown as Json,
      after: { merged_into: targetIncidentId } as unknown as Json,
    },
    client,
  );
}

// --- Get linked complaints + evidence ---------------------------------------

export async function getIncidentComplaints(
  incidentId: string,
  client?: SupabaseClient,
): Promise<ComplaintWithRelations[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('complaints')
    .select(
      `
      *,
      profiles:profiles!complaints_user_id_fkey ( id, name, avatar_url ),
      categories ( id, name, icon ),
      complaint_images ( id, storage_path, image_url, created_at )
    `,
    )
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ComplaintWithRelations[];
}

export async function getIncidentLinks(
  incidentId: string,
  client?: SupabaseClient,
): Promise<DuplicateLinkRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('duplicate_links')
    .select('*')
    .eq('incident_id', incidentId)
    .order('linked_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DuplicateLinkRow[];
}

/** Fetches all photos across all complaints linked to an incident. */
export async function getIncidentPhotos(
  incidentId: string,
  client?: SupabaseClient,
): Promise<ComplaintImageRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('complaint_images')
    .select('*')
    .in(
      'complaint_id',
      (await db.from('duplicate_links').select('complaint_id').eq('incident_id', incidentId)).data?.map((r: { complaint_id: string }) => r.complaint_id) ?? [],
    )
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ComplaintImageRow[];
}

// --- Stats recalculation ----------------------------------------------------

/**
 * Recalculates the denormalized stats (report_count, citizen_count, photo_count)
 * for an incident based on linked complaints.
 */
export async function recalculateIncidentStats(
  incidentId: string,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);

  // Count complaints linked to this incident.
  const { data: complaints, error: cErr } = await db
    .from('complaints')
    .select('user_id')
    .eq('incident_id', incidentId);
  if (cErr) throw cErr;

  const all = (complaints ?? []) as { user_id: string }[];
  const reportCount = all.length;
  const citizenCount = new Set(all.map((c) => c.user_id)).size;

  // Count photos across those complaints.
  const complaintIds = (await db.from('duplicate_links').select('complaint_id').eq('incident_id', incidentId)).data?.map((r: { complaint_id: string }) => r.complaint_id) ?? [];
  
  let photoCount = 0;
  if (complaintIds.length > 0) {
    const { count } = await db
      .from('complaint_images')
      .select('*', { count: 'exact', head: true })
      .in('complaint_id', complaintIds);
    photoCount = count ?? 0;
  }

  const { error: updError } = await db
    .from('civic_incidents')
    .update({
      report_count: reportCount,
      citizen_count: citizenCount,
      photo_count: photoCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', incidentId);
  if (updError) throw updError;
}

// --- Auto-detection of potential duplicates ---------------------------------

export interface PotentialDuplicate {
  complaint_id: string;
  complaint_number: string;
  title: string;
  severity: string;
  status: string;
  address: string | null;
  ward: string | null;
  created_at: string;
  distance_meters: number | null;
}

/**
 * Finds complaints near a given location that may be duplicates.
 * Uses PostGIS ST_DWithin to find complaints within a radius.
 * Does NOT automatically link — returns candidates for admin review.
 */
export async function findPotentialDuplicates(
  lat: number,
  lng: number,
  radiusMeters: number = 500,
  excludeComplaintId?: string,
  client?: SupabaseClient,
): Promise<PotentialDuplicate[]> {
  const db = getClient(client);

  // Use the RPC approach for PostGIS queries.
  const { data, error } = await db.rpc('find_nearby_complaints', {
    p_lat: lat,
    p_lng: lng,
    p_radius: radiusMeters,
    p_exclude: excludeComplaintId ?? null,
  });

  if (error) {
    // If the RPC doesn't exist yet, return empty — no automatic detection.
    return [];
  }

  return (data ?? []) as unknown as PotentialDuplicate[];
}
