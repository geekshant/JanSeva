-- ============================================================================
-- JanMitra Database Setup - Step 11: Similar-Report Detection & Community Leaderboard
-- ============================================================================
-- Run after 10_community_verification.sql (idempotent: safe to re-run).
--
-- What this creates:
--   * find_similar_complaints() - same-category candidates near a point for
--       the Report Issue flow: PostGIS radius filter (ST_DWithin, metres,
--       GiST-indexed) ranked by pg_trgm title similarity then distance.
--       Privacy-safe projection (no user_id).
--   * join_similar_complaint() - validates the candidate (same category +
--       within radius), then files the citizen's report atomically with its
--       images, mirroring create_complaint (including idempotent retries via
--       complaints.idempotency_key). The complaint-insert triggers (points,
--       status history, notifications) fire as usual.
--   * add_evidence_to_complaint() - attaches extra evidence photos to the
--       CALLER'S OWN complaint and returns the updated row.
--   * community_leaderboard() - top civic contributors: rank/name/points/
--       level plus an is_me flag for the signed-in citizen. Privacy-safe:
--       no user ids or emails are exposed.
--
-- Known schema gaps (kept so the RPC shapes stay stable for the app):
--   * There is no civic_incidents table in this schema, so the incident_*
--     columns returned by find_similar_complaints are always NULL/0.
--   * add_evidence_to_complaint cannot move a complaint into an AI status:
--     the complaint_status enum has no AI_* value, so the row is returned
--     with its status unchanged.
-- ============================================================================

-- pg_trgm powers the title-similarity ranking in find_similar_complaints.
create extension if not exists pg_trgm schema extensions;

-- ----------------------------------------------------------------------------
-- 1. find_similar_complaints(): nearby same-category candidates so the
--    citizen can join an existing report instead of filing a duplicate.
-- ----------------------------------------------------------------------------
create or replace function public.find_similar_complaints(
  p_lat        double precision,
  p_lng        double precision,
  p_category_id uuid,
  p_title      text    default null,
  p_radius_m   integer default 250,
  p_limit      integer default 8
)
returns table (
  complaint_id         uuid,
  complaint_number     text,
  title                text,
  category_id          uuid,
  category_name        text,
  severity             text,
  status               text,
  address              text,
  created_at           timestamptz,
  distance_meters      double precision,
  title_similarity     double precision,
  incident_id          uuid,
  incident_number      text,
  incident_report_count integer,
  incident_status      text
)
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $$
  select
    c.id,
    c.complaint_number,
    c.title,
    c.category_id,
    coalesce(cat.name, ''),
    c.severity::text,
    c.status::text,
    coalesce(c.address, ''),
    c.created_at,
    st_distance(c.location, st_setsrid(st_point(p_lng, p_lat), 4326)::geography) as distance_meters,
    case
      when p_title is null or p_title = '' then 0.0
      else similarity(c.title, p_title)
    end as title_similarity,
    null::uuid   as incident_id,
    null::text   as incident_number,
    0            as incident_report_count,
    null::text   as incident_status
  from public.complaints c
  left join public.categories cat on cat.id = c.category_id
  where c.category_id = p_category_id
    and c.location is not null
    and c.status <> 'REJECTED'
    and st_dwithin(
          c.location,
          st_setsrid(st_point(p_lng, p_lat), 4326)::geography,
          p_radius_m
        )
  order by title_similarity desc, distance_meters asc
  limit p_limit;
$$;

revoke all on function public.find_similar_complaints(double precision, double precision, uuid, text, integer, integer)
  from public, anon;
grant execute on function public.find_similar_complaints(double precision, double precision, uuid, text, integer, integer)
  to authenticated;

-- ----------------------------------------------------------------------------
-- 2. join_similar_complaint(): validate the match, then file the new report
--    in one transaction (create_complaint-style insert + image records).
--    p_idempotency_key makes network retries return the already-created
--    complaint instead of creating a duplicate.
-- ----------------------------------------------------------------------------
create or replace function public.join_similar_complaint(
  p_match_complaint_id uuid,
  p_category_id        uuid,
  p_title              text,
  p_description        text,
  p_severity           text,
  p_lat                double precision,
  p_lng                double precision,
  p_address            text,
  p_image_urls         text[],
  p_image_paths        text[],
  p_idempotency_key    text default null
)
returns public.complaints
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_complaint  public.complaints;
  v_match      public.complaints;
  v_profile_id uuid;
  v_count      int;
begin
  -- Resolve the current user's profile id
  select id into v_profile_id from public.profiles where auth_user_id = auth.uid();
  if v_profile_id is null then
    raise exception 'Profile not found for current user';
  end if;

  -- Idempotent retry: a previous attempt already created this complaint.
  if p_idempotency_key is not null then
    select * into v_complaint from public.complaints
     where user_id = v_profile_id
       and idempotency_key = p_idempotency_key;
    if found then
      return v_complaint;
    end if;
  end if;

  -- Validate the matched complaint: it must still exist, be the same
  -- category, and (when the caller knows where it is) be within 250 m.
  select * into v_match from public.complaints where id = p_match_complaint_id;
  if not found then
    raise exception 'Matched complaint not found';
  end if;
  if v_match.category_id <> p_category_id then
    raise exception 'Matched complaint belongs to a different category';
  end if;
  if p_lat is not null
     and p_lng is not null
     and v_match.location is not null
     and not st_dwithin(
            v_match.location,
            st_setsrid(st_point(p_lng, p_lat), 4326)::geography,
            250
          ) then
    raise exception 'Matched complaint is too far away';
  end if;

  -- File the new report (complaint-insert triggers fire as usual).
  begin
    insert into public.complaints (user_id, category_id, title, description, severity, location, address, idempotency_key)
    values (
      v_profile_id,
      p_category_id,
      p_title,
      p_description,
      p_severity::public.complaint_severity,
      case
        when p_lat is not null and p_lng is not null
          then st_setsrid(st_point(p_lng, p_lat), 4326)::geography
        else null
      end,
      p_address,
      p_idempotency_key
    )
    returning * into v_complaint;
  exception when unique_violation then
    -- Concurrent retry with the same idempotency key: return the winner.
    select * into v_complaint from public.complaints
     where user_id = v_profile_id
       and idempotency_key = p_idempotency_key;
    if found then
      return v_complaint;
    end if;
    raise;
  end;

  -- Insert complaint image records (if any)
  if p_image_urls is not null and array_length(p_image_urls, 1) > 0 then
    for v_count in 1..array_length(p_image_urls, 1) loop
      insert into public.complaint_images (complaint_id, storage_path, image_url)
      values (v_complaint.id, p_image_paths[v_count], p_image_urls[v_count]);
    end loop;
  end if;

  return v_complaint;
end;
$$;

revoke all on function public.join_similar_complaint(uuid, uuid, text, text, text, double precision, double precision, text, text[], text[], text)
  from public, anon;
grant execute on function public.join_similar_complaint(uuid, uuid, text, text, text, double precision, double precision, text, text[], text[], text)
  to authenticated;

-- ----------------------------------------------------------------------------
-- 3. add_evidence_to_complaint(): attach more evidence photos to the caller's
--    own complaint (officer requested more evidence / re-submission after a
--    failed AI check) and return the updated row. Ownership is enforced
--    server-side; clients cannot attach images to someone else's complaint.
-- ----------------------------------------------------------------------------
create or replace function public.add_evidence_to_complaint(
  p_complaint_id uuid,
  p_image_urls   text[],
  p_image_paths  text[]
)
returns public.complaints
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_complaint  public.complaints;
  v_profile_id uuid;
  v_count      int;
begin
  select id into v_profile_id from public.profiles where auth_user_id = auth.uid();
  if v_profile_id is null then
    raise exception 'Profile not found for current user';
  end if;

  select * into v_complaint from public.complaints
   where id = p_complaint_id
     and user_id = v_profile_id;
  if not found then
    raise exception 'Complaint not found or not owned by current user';
  end if;

  if p_image_urls is not null and array_length(p_image_urls, 1) > 0 then
    if p_image_paths is null
       or array_length(p_image_paths, 1) <> array_length(p_image_urls, 1) then
      raise exception 'p_image_urls and p_image_paths must have the same length';
    end if;
    for v_count in 1..array_length(p_image_urls, 1) loop
      insert into public.complaint_images (complaint_id, storage_path, image_url)
      values (p_complaint_id, p_image_paths[v_count], p_image_urls[v_count]);
    end loop;
  end if;

  -- Status is left unchanged: the complaint_status enum has no AI queue
  -- value, so there is nothing to re-queue here.
  return v_complaint;
end;
$$;

revoke all on function public.add_evidence_to_complaint(uuid, text[], text[])
  from public, anon;
grant execute on function public.add_evidence_to_complaint(uuid, text[], text[])
  to authenticated;

-- ----------------------------------------------------------------------------
-- 4. community_leaderboard(): top civic contributors for the Rewards screen.
--    SECURITY DEFINER because profiles RLS only lets citizens read their own
--    row; this exposes name/points/level only (never ids or emails) and flags
--    the caller's own row via is_me.
-- ----------------------------------------------------------------------------
create or replace function public.community_leaderboard(
  p_limit integer default 50
)
returns table (
  rank   bigint,
  name   text,
  points integer,
  level  integer,
  is_me  boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    row_number() over (order by p.points desc, p.created_at asc) as rank,
    p.name,
    p.points,
    p.level,
    p.auth_user_id = auth.uid() as is_me
  from public.profiles p
  order by p.points desc, p.created_at asc
  limit p_limit;
$$;

revoke all on function public.community_leaderboard(integer) from public, anon;
grant execute on function public.community_leaderboard(integer) to authenticated;

-- ----------------------------------------------------------------------------
-- Verify:
--   select public.find_similar_complaints(12.97, 77.59, '<category uuid>');
--   select rank, name, points, level, is_me from public.community_leaderboard(10);
--   select proname from pg_proc where proname in
--     ('find_similar_complaints', 'join_similar_complaint',
--      'add_evidence_to_complaint', 'community_leaderboard');
-- ----------------------------------------------------------------------------
