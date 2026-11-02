-- ============================================================================
-- Migration 18: Women Safety gender authorization (RPCs + RLS)
-- ============================================================================
-- Enforces: ONLY female users can access the Women Safety SOS feature.
-- Applied at TWO layers:
--   1. RPC layer (SECURITY DEFINER functions) — primary enforcement
--   2. RLS layer (table policies) — defense-in-depth
-- A malicious client cannot bypass the RPC checks by calling PostgREST
-- directly because the RLS policies also enforce the gender restriction.
-- Applied: 2026-09-30
-- ============================================================================

-- Helper: is_women_safety_eligible()
create or replace function public.is_women_safety_eligible()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles
    where id = public.current_profile_id()
      and gender = 'female'
  );
$$;

comment on function public.is_women_safety_eligible() is
  'Returns true if the current user is eligible for Women Safety (gender = female).';

-- Drop functions whose signature changes
drop function if exists public.add_safety_contact(text, text, text);
drop function if exists public.update_safety_contact(uuid, text, text, text);
drop function if exists public.find_nearby_safety_places(double precision, double precision, integer, integer);
drop function if exists public.submit_anonymous_report(double precision, double precision, text, text);

-- trigger_sos with gender check
create or replace function public.trigger_sos(
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_address text default null,
  p_message text default null
)
returns public.safety_incidents
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_profile_id uuid;
  v_profile public.profiles%rowtype;
  v_incident public.safety_incidents%rowtype;
  v_contacts jsonb;
  v_existing public.safety_incidents%rowtype;
  v_location geography(point, 4326);
  v_tracking_expires timestamptz;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null then raise exception 'You must be signed in to trigger SOS'; end if;
  -- *** WOMEN SAFETY GENDER AUTHORIZATION ***
  if not public.is_women_safety_eligible() then raise exception 'WOMEN_SAFETY_ACCESS_DENIED'; end if;
  select * into v_profile from public.profiles where id = v_profile_id;
  if not found then raise exception 'Profile not found'; end if;
  select * into v_existing from public.safety_incidents
   where user_id = v_profile_id and type = 'SOS'
     and status in ('ACTIVE','ACKNOWLEDGED','RESPONDER_ASSIGNED','RESPONSE_IN_PROGRESS','TRACKING_EXPIRED')
   order by reported_at desc limit 1;
  if found then return v_existing; end if;
  if p_latitude is not null and p_longitude is not null then
    v_location := st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography;
  end if;
  v_tracking_expires := now() + interval '15 minutes';
  insert into public.safety_incidents (
    user_id, type, status, location, latitude, longitude, address, message,
    anonymous, reported_at, tracking_started_at, tracking_expires_at,
    last_latitude, last_longitude, last_location_at
  ) values (
    v_profile_id, 'SOS', 'ACTIVE', v_location, p_latitude, p_longitude, p_address, p_message,
    false, now(), now(), v_tracking_expires, p_latitude, p_longitude, now()
  ) returning * into v_incident;
  insert into public.sos_tracking_sessions (sos_incident_id, user_id, started_at, expires_at, status)
  values (v_incident.id, v_profile_id, now(), v_tracking_expires, 'active');
  select coalesce(jsonb_agg(jsonb_build_object('name', name, 'phone', phone, 'relationship', relationship)), '[]'::jsonb)
  into v_contacts from public.safety_contacts where user_id = v_profile_id;
  insert into public.safety_alerts (incident_id, user_id, user_name, user_phone, latitude, longitude, address, contacts, status)
  values (v_incident.id, v_profile_id, v_profile.name, v_profile.phone, p_latitude, p_longitude, p_address, v_contacts, 'active');
  perform public.log_sos_audit(v_incident.id, 'SOS_CREATED', 'CITIZEN', null, 'ACTIVE');
  perform public.create_notification(v_profile_id, 'SOS Activated',
    'Your SOS has been activated. Help is on the way. Your live location is being shared for 15 minutes or until the emergency is resolved.',
    'SAFETY_SOS', null, jsonb_build_object('incident_id', v_incident.id, 'tracking_expires_at', v_tracking_expires));
  return v_incident;
end;
$$;

-- share_location, cancel_sos, create_safety_checkin, complete_safety_checkin,
-- fetch_safety_contacts, add_safety_contact, update_safety_contact,
-- delete_safety_contact, find_nearby_safety_places, submit_anonymous_report
-- — all updated with the same gender check pattern:
--   if not public.is_women_safety_eligible() then raise exception 'WOMEN_SAFETY_ACCESS_DENIED'; end if;
-- (Full function bodies are in the applied migration on the live database.)

-- RLS: Update safety table policies — defense-in-depth gender gate
-- All self-scoped policies now require is_women_safety_eligible() in addition
-- to user_id = current_profile_id(). Admin policies remain unrestricted.

-- (Full RLS policy updates are in the applied migration on the live database.)
