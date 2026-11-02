-- ============================================================================
-- JanMitra Database Setup - Step 8: Reputation Read API & Hardening
-- ============================================================================
-- Run after 07_reputation.sql (idempotent: safe to re-run).
--
-- What this creates:
--   * get_reputation_summary() - server-computed reputation summary RPC
--       (points, level title from level_config, progress to next level)
--     The Flutter app never hard-codes level thresholds or computes
--     progress itself - it calls this RPC and renders what the database says.
--   * community_complaint_stats() - privacy-safe aggregate counts for the
--       Home dashboard (counts only, never individual rows)
--   * nearby_complaints() - privacy-safe nearby map view (PostGIS
--       ST_DWithin/ST_Distance in metres, ordered by distance)
--   * Legacy trigger cleanup - removes the old hard-coded +10
--     award_complaint_points trigger if 02 was (re)run after 07, so exactly
--     one reward engine (reward_rules-driven) remains.
--   * profiles INSERT guard - clients cannot insert a profile row with a
--     pre-set points/level either (the UPDATE path is guarded in 07).
--
-- SECURITY MODEL (unchanged from 07, extended):
--   * award_points / record_volunteer_activity / check_and_award_badges are
--     service_role-only; clients cannot award themselves points.
--   * rewards / user_badges have no client INSERT/UPDATE policies.
--   * profiles.points / profiles.level cannot be written by clients on
--     INSERT or UPDATE (only server-side functions set the GUC).
--   * get_reputation_summary is read-only and returns only the caller's
--     own data (resolved from auth.uid(), never from client input).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Legacy cleanup: exactly one reward engine must remain.
--    02_functions_triggers.sql (and janmitra_full_setup.sql) create a
--    hard-coded +10 COMPLAINT_SUBMITTED trigger. If those scripts are run
--    after 07, drop the legacy trigger again so:
--      a) points are only awarded from reward_rules, and
--      b) the legacy function cannot trip the profiles protect trigger.
-- ----------------------------------------------------------------------------
drop trigger if exists complaints_award_points on public.complaints;
drop function if exists public.award_complaint_points();

-- ----------------------------------------------------------------------------
-- 2. profiles guard: also reject client INSERTs with a pre-set points/level.
--    (handle_new_user inserts defaults 0/1 and passes; award_points sets
--    janmitra.allow_reputation_write and passes.)
-- ----------------------------------------------------------------------------
create or replace function public.protect_reputation_columns()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if coalesce(current_setting('janmitra.allow_reputation_write', true), '') = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.points is distinct from 0 or new.level is distinct from 1 then
      raise exception 'points/level cannot be set directly';
    end if;
    return new;
  end if;

  if new.points is distinct from old.points then
    raise exception 'points cannot be modified directly';
  end if;
  if new.level is distinct from old.level then
    raise exception 'level cannot be modified directly';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_reputation on public.profiles;
create trigger profiles_protect_reputation
  before insert or update on public.profiles
  for each row execute function public.protect_reputation_columns();

-- ----------------------------------------------------------------------------
-- 3. get_reputation_summary(): read-only summary for the Rewards screen.
--    All level/progress logic lives here, reading level_config - thresholds
--    stay configurable in the database and are never hard-coded in Flutter.
-- ----------------------------------------------------------------------------
create or replace function public.get_reputation_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_profile     public.profiles%rowtype;
  v_current     public.level_config%rowtype;
  v_next        public.level_config%rowtype;
  v_has_next    boolean := false;
  v_floor       integer;
  v_span        integer;
  v_badge_count integer := 0;
begin
  select * into v_profile
    from public.profiles
   where auth_user_id = auth.uid();
  if not found then
    raise exception 'Profile not found for current user';
  end if;

  select * into v_current
    from public.level_config
   where level = v_profile.level
   order by level desc
   limit 1;

  -- Lowest configured threshold strictly above the user's points = next level.
  select * into v_next
    from public.level_config
   where min_points > v_profile.points
   order by min_points asc
   limit 1;
  v_has_next := found;

  select count(*) into v_badge_count
    from public.user_badges
   where user_id = v_profile.id;

  v_floor := coalesce(v_current.min_points, 0);

  return jsonb_build_object(
    'points',               v_profile.points,
    'level',                v_profile.level,
    'level_title',          coalesce(v_current.title, 'Level ' || v_profile.level),
    'level_min_points',     v_floor,
    'next_level',           case when v_has_next then v_next.level end,
    'next_level_title',     case when v_has_next then v_next.title end,
    'next_level_min_points', case when v_has_next then v_next.min_points end,
    'points_to_next',       case
                              when not v_has_next then 0
                              else greatest(v_next.min_points - v_profile.points, 0)
                            end,
    'progress_percent',     case
                              when not v_has_next then 100
                              when (v_next.min_points - v_floor) <= 0 then 100
                              else least(
                                greatest(
                                  round(
                                    (v_profile.points - v_floor) * 100.0
                                    / (v_next.min_points - v_floor)
                                  )::int,
                                  0
                                ),
                                100
                              )
                            end,
    'is_max_level',         not v_has_next,
    'badge_count',          v_badge_count
  );
end;
$$;

-- Read-only summary: authenticated callers only.
revoke all on function public.get_reputation_summary() from public, anon;
grant execute on function public.get_reputation_summary() to authenticated;
grant execute on function public.get_reputation_summary() to service_role;

-- ----------------------------------------------------------------------------
-- 4. community_complaint_stats(): privacy-safe aggregate counts for the
--    Home dashboard. Returns counts only (never individual rows), replacing
--    the need for any broad SELECT policy on public.complaints.
-- ----------------------------------------------------------------------------
create or replace function public.community_complaint_stats()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'with_location', (select count(*) from public.complaints where location is not null),
    'resolved',      (select count(*) from public.complaints where status = 'RESOLVED'),
    'in_progress',   (select count(*) from public.complaints where status = 'IN_PROGRESS'),
    'pending',       (select count(*) from public.complaints where status in ('SUBMITTED','VERIFIED','ASSIGNED'))
  );
$$;

revoke all on function public.community_complaint_stats() from public, anon;
grant execute on function public.community_complaint_stats() to authenticated;

-- ----------------------------------------------------------------------------
-- 5. nearby_complaints(): privacy-safe nearby map view for signed-in citizens.
--    SECURITY DEFINER because 03_rls_policies.sql deliberately has NO broad
--    SELECT policy on public.complaints - this function only exposes a safe
--    projection (no user_id, truncated description) filtered by distance.
--    Returns `location` as GeoJSON (jsonb) so the Flutter client can parse it
--    directly with GeoPoint.tryFromGeoJson - PostgREST serialises a raw
--    geography column as hex EWKB text, not GeoJSON.
-- ----------------------------------------------------------------------------
create or replace function public.nearby_complaints(
  p_latitude      double precision,
  p_longitude     double precision,
  p_radius_meters integer default 1000,
  p_limit         integer default 100
)
returns table (
  id               uuid,
  complaint_number text,
  category_id      uuid,
  title            text,
  description      text,
  severity         text,
  status           text,
  address          text,
  created_at       timestamptz,
  category_name    text,
  category_icon    text,
  location         jsonb,
  distance_meters  double precision
)
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $$
  select
    c.id,
    c.complaint_number,
    c.category_id,
    c.title,
    left(c.description, 160),
    c.severity::text,
    c.status::text,
    c.address,
    c.created_at,
    cat.name,
    cat.icon,
    case
      when c.location is not null
        then st_asgeojson(c.location::geometry)::jsonb
    end,
    st_distance(c.location, st_setsrid(st_point(p_longitude, p_latitude), 4326)::geography) as distance_meters
  from public.complaints c
  left join public.categories cat on cat.id = c.category_id
  where c.location is not null
    and st_dwithin(
          c.location,
          st_setsrid(st_point(p_longitude, p_latitude), 4326)::geography,
          p_radius_meters
        )
  order by distance_meters asc
  limit p_limit;
$$;

-- ----------------------------------------------------------------------------
-- 6. nearby_complaints: revoke anonymous execution (citizens must sign in).
-- ----------------------------------------------------------------------------
revoke execute on function public.nearby_complaints(double precision, double precision, integer, integer)
  from public, anon;
grant execute on function public.nearby_complaints(double precision, double precision, integer, integer)
  to authenticated;

-- ----------------------------------------------------------------------------
-- Verify:
--   select public.get_reputation_summary();          -- as a signed-in user
--   select tgname from pg_trigger
--    where tgrelid = 'public.complaints'::regclass
--      and tgname like 'complaints_award%';           -- only the 07 trigger
--   select proname from pg_proc where proname = 'award_complaint_points';
--                                                       -- should be 0 rows
--   -- client write attempts must fail:
--   --   update public.profiles set points = 99999 where ...;  -> exception
--   --   insert into public.rewards ...;                       -> RLS denied
-- ----------------------------------------------------------------------------
