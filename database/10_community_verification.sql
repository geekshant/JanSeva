-- ============================================================================
-- JanMitra Database Setup - Step 10: Community Verification & Resolution Evidence
-- ============================================================================
-- Implements the post-resolution verification workflow:
--   Officer resolves -> verification_status='pending' (auto, via trigger in
--   02_functions_triggers.sql) -> officer uploads resolution evidence ->
--   nearby citizens respond (community_verifications) -> admin confirms /
--   reopens / marks needs-review.
--
-- Idempotent: safe to run on databases where these objects already exist
-- (they were applied to the live project directly).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. complaints.verification_status column
-- ----------------------------------------------------------------------------
alter table public.complaints
  add column if not exists verification_status text
  check (verification_status in ('pending', 'confirmed', 'reopened', 'needs_review'));

-- ----------------------------------------------------------------------------
-- 2. resolution_evidence table ("after" images uploaded on resolution)
-- ----------------------------------------------------------------------------
create table if not exists public.resolution_evidence (
  id           uuid        not null default gen_random_uuid() primary key,
  complaint_id uuid        not null,
  storage_path text        not null,
  image_url    text        not null,
  uploaded_by  uuid        references auth.users (id) on delete set null,
  caption      text,
  created_at   timestamptz not null default now(),
  foreign key (complaint_id) references public.complaints (id) on delete cascade
);

-- ----------------------------------------------------------------------------
-- 3. community_verifications table (citizen responses on resolution validity)
-- ----------------------------------------------------------------------------
create table if not exists public.community_verifications (
  id           uuid        not null default gen_random_uuid() primary key,
  complaint_id uuid        not null,
  user_id      uuid        not null,
  verified     boolean     not null,
  comment      text,
  created_at   timestamptz not null default now(),
  foreign key (complaint_id) references public.complaints (id) on delete cascade,
  foreign key (user_id) references public.profiles (id) on delete cascade
);

-- One response per citizen per complaint.
alter table public.community_verifications
  drop constraint if exists community_verifications_complaint_user_unique;
alter table public.community_verifications
  add constraint community_verifications_complaint_user_unique
  unique (complaint_id, user_id);

-- ----------------------------------------------------------------------------
-- 4. RLS policies
-- ----------------------------------------------------------------------------
alter table public.resolution_evidence enable row level security;
alter table public.community_verifications enable row level security;

-- resolution_evidence: any authenticated user may read; any authenticated
-- user (officer/admin) may insert; admins may delete (storage delete handled
-- client-side + the admin storage RLS policy in 04_storage.sql).
drop policy if exists "resolution_evidence_read" on public.resolution_evidence;
create policy "resolution_evidence_read"
  on public.resolution_evidence for select
  to authenticated
  using (true);

drop policy if exists "resolution_evidence_insert" on public.resolution_evidence;
create policy "resolution_evidence_insert"
  on public.resolution_evidence for insert
  to authenticated
  with check (true);

drop policy if exists "resolution_evidence_admin_delete" on public.resolution_evidence;
create policy "resolution_evidence_admin_delete"
  on public.resolution_evidence for delete
  to authenticated
  using (public.is_admin());

-- community_verifications: any authenticated user may read; a citizen may
-- insert only their own response (user_id = own profile row).
drop policy if exists "community_verifications_read" on public.community_verifications;
create policy "community_verifications_read"
  on public.community_verifications for select
  to authenticated
  using (true);

drop policy if exists "community_verifications_insert" on public.community_verifications;
create policy "community_verifications_insert"
  on public.community_verifications for insert
  to authenticated
  with check (user_id = public.current_profile_id());

-- ----------------------------------------------------------------------------
-- 5. submit_community_verification RPC (atomic citizen response + summary)
-- ----------------------------------------------------------------------------
create or replace function public.submit_community_verification(
  p_complaint_id uuid,
  p_verified boolean,
  p_comment text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_status public.complaint_status;
  v_verification_status text;
  v_profile_id uuid;
  v_existing uuid;
  v_total int;
  v_verified_count int;
begin
  -- community_verifications.user_id references profiles(id), which is NOT
  -- the auth uid - resolve the caller's profile row first.
  select id into v_profile_id from public.profiles where auth_user_id = auth.uid();
  if v_profile_id is null then
    raise exception 'Profile not found for current user';
  end if;

  select status, coalesce(verification_status, '') into v_status, v_verification_status
  from public.complaints where id = p_complaint_id;

  if not found then
    raise exception 'Complaint not found';
  end if;
  if v_status <> 'RESOLVED' then
    raise exception 'Community verification is only available for resolved complaints';
  end if;
  if v_verification_status <> 'pending' then
    raise exception 'Community verification is not open for this complaint';
  end if;

  select id into v_existing from public.community_verifications
  where complaint_id = p_complaint_id and user_id = v_profile_id
  limit 1;
  if found then
    raise exception 'You have already responded to this verification';
  end if;

  insert into public.community_verifications (complaint_id, user_id, verified, comment)
  values (p_complaint_id, v_profile_id, p_verified, p_comment);

  select count(*) into v_total from public.community_verifications
  where complaint_id = p_complaint_id;
  select count(*) into v_verified_count from public.community_verifications
  where complaint_id = p_complaint_id and verified;

  return jsonb_build_object(
    'total', v_total,
    'verified', v_verified_count,
    'rejected', v_total - v_verified_count,
    'verification_rate', case when v_total > 0 then round(v_verified_count * 100.0 / v_total)::int else 0 end,
    'status', 'pending'
  );
end;
$$;

revoke all on function public.submit_community_verification(uuid, boolean, text) from public, anon;
grant execute on function public.submit_community_verification(uuid, boolean, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. verifiable_complaints RPC (mobile discovery of pending verifications)
-- ----------------------------------------------------------------------------
create or replace function public.verifiable_complaints(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters integer default 2000,
  p_limit integer default 50
) returns table(
  id uuid,
  complaint_number text,
  title text,
  category_name text,
  category_icon text,
  address text,
  created_at timestamptz,
  resolved_at timestamptz,
  location jsonb,
  distance_meters double precision,
  before_image_path text,
  after_image_path text,
  verified_count bigint,
  rejected_count bigint,
  has_verified boolean
)
language sql
security definer
set search_path to 'public', 'extensions'
as $$
  select
    c.id,
    c.complaint_number,
    c.title,
    cat.name,
    cat.icon,
    coalesce(c.address, ''),
    c.created_at,
    c.resolved_at,
    -- GeoJSON (not the raw geography column): PostgREST serialises a raw
    -- geography value as hex EWKB text, which GeoPoint.tryFromGeoJson
    -- cannot parse.
    ST_AsGeoJSON(c.location::geometry)::jsonb as location,
    ST_Distance(c.location, ST_SetSRID(ST_Point(p_longitude, p_latitude), 4326)::geography) as distance_meters,
    (select ci.storage_path from public.complaint_images ci
       where ci.complaint_id = c.id order by ci.created_at limit 1) as before_image_path,
    (select re.storage_path from public.resolution_evidence re
       where re.complaint_id = c.id order by re.created_at limit 1) as after_image_path,
    (select count(*) from public.community_verifications cv
       where cv.complaint_id = c.id and cv.verified) as verified_count,
    (select count(*) from public.community_verifications cv
       where cv.complaint_id = c.id and not cv.verified) as rejected_count,
    -- cv.user_id holds profiles(id), not the auth uid - resolve the caller's
    -- profile row before comparing.
    exists(select 1 from public.community_verifications cv
       where cv.complaint_id = c.id
         and cv.user_id = (select p.id from public.profiles p
                            where p.auth_user_id = auth.uid())) as has_verified
  from public.complaints c
  left join public.categories cat on cat.id = c.category_id
  where c.location is not null
    and c.status = 'RESOLVED'
    and c.verification_status = 'pending'
    and ST_DWithin(c.location, ST_SetSRID(ST_Point(p_longitude, p_latitude), 4326)::geography, p_radius_meters)
  order by distance_meters asc
  limit p_limit;
$$;

revoke all on function public.verifiable_complaints(double precision, double precision, integer, integer) from public, anon;
grant execute on function public.verifiable_complaints(double precision, double precision, integer, integer) to authenticated;
