-- ============================================================================
-- JanMitra Database Setup - Step 2: Functions & Triggers
-- ============================================================================
-- Run after 01_schema.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- HELPER: generate complaint number (JM-YYYY-000001 format)
-- ----------------------------------------------------------------------------
create or replace function public.generate_complaint_number()
returns text
language sql
set search_path to 'public'
as $$
  select 'JM-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.complaint_number_seq')::text, 6, '0');
$$;

-- ----------------------------------------------------------------------------
-- HELPER: current user's profile id
-- ----------------------------------------------------------------------------
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select id from public.profiles where auth_user_id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- HELPER: is the complaint owned by the current user?
-- ----------------------------------------------------------------------------
create or replace function public.is_own_complaint(c_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.complaints c
    where c.id = c_id
      and c.user_id = (select id from public.profiles where auth_user_id = auth.uid())
  );
$$;

-- ----------------------------------------------------------------------------
-- HELPER: is the caller an admin?
-- Referenced by RLS policies in 04_storage.sql (admin access to all
-- complaint images) and 10_community_verification.sql (admin delete of
-- resolution evidence), so it must exist before those files run.
-- This schema has no roles table: admins are flagged via the caller's JWT
-- app_metadata role (Dashboard > Authentication > Users > user > app_metadata
-- -> {"role": "admin"}). Secure default when no role is set: false.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')) in
           ('admin', 'system_admin', 'department_admin', 'officer');
$$;

-- ----------------------------------------------------------------------------
-- TRIGGER FUNCTION: auto-create a profile when a new auth user signs up
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (auth_user_id, name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.email
  );
  return new;
end;
$$;

-- Trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- TRIGGER FUNCTION: set updated_at on row update
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- TRIGGER FUNCTION: award 10 points when a complaint is submitted
-- ----------------------------------------------------------------------------
create or replace function public.award_complaint_points()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.rewards (user_id, complaint_id, activity_type, points, description)
  values (new.user_id, new.id, 'COMPLAINT_SUBMITTED', 10,
          'Points earned for reporting: ' || new.complaint_number);

  update public.profiles
  set points = points + 10
  where id = new.user_id;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- TRIGGER FUNCTION: create initial status history entry on complaint insert
-- ----------------------------------------------------------------------------
create or replace function public.create_initial_status_history()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_auth_user_id uuid;
begin
  select auth_user_id into v_auth_user_id from public.profiles where id = new.user_id;
  insert into public.complaint_status_history (complaint_id, status, comment, updated_by)
  values (new.id, new.status, 'Complaint submitted', v_auth_user_id);
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- TRIGGER FUNCTION: record status changes + set resolved_at + auto-open
-- community verification. When a complaint transitions INTO 'RESOLVED',
-- verification_status is set to 'pending' so nearby citizens can respond.
-- Confirm/needs-review updates don't touch `status`, so this trigger (which
-- only fires on status change) never overrides an explicit verification_status.
-- ----------------------------------------------------------------------------
create or replace function public.record_status_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status is distinct from old.status then
    insert into public.complaint_status_history (complaint_id, status, comment, updated_by)
    values (new.id, new.status, null, auth.uid());
  end if;
  if new.status = 'RESOLVED' and old.status is distinct from 'RESOLVED' then
    new.resolved_at := now();
    new.verification_status := 'pending';
  elsif new.status is distinct from 'RESOLVED' and old.status = 'RESOLVED' then
    new.resolved_at := null;
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- TRIGGERS on complaints
-- ----------------------------------------------------------------------------
drop trigger if exists complaints_set_updated_at on public.complaints;
create trigger complaints_set_updated_at
  before update on public.complaints
  for each row execute function public.set_updated_at();

drop trigger if exists complaints_award_points on public.complaints;
create trigger complaints_award_points
  after insert on public.complaints
  for each row execute function public.award_complaint_points();

drop trigger if exists complaints_create_initial_history on public.complaints;
create trigger complaints_create_initial_history
  after insert on public.complaints
  for each row execute function public.create_initial_status_history();

drop trigger if exists complaints_record_status_change on public.complaints;
create trigger complaints_record_status_change
  before update of status on public.complaints
  for each row
  when (new.status is distinct from old.status)
  execute function public.record_status_change();

-- ----------------------------------------------------------------------------
-- TRIGGER on profiles
-- ----------------------------------------------------------------------------
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RPC: create a complaint (PostGIS location + images in one transaction)
-- p_idempotency_key: the mobile app sends a per-submission key so network
-- retries return the already-created complaint instead of a duplicate
-- (backed by complaints.idempotency_key + a partial unique index, added in
-- 01_schema.sql). The pre-idempotency signature is dropped first so a re-run
-- cannot leave two conflicting overloads behind.
-- ----------------------------------------------------------------------------
drop function if exists public.create_complaint(uuid, text, text, text, double precision, double precision, text, text[], text[]);

create or replace function public.create_complaint(
  p_category_id uuid,
  p_title       text,
  p_description text,
  p_severity    text,
  p_latitude    double precision,
  p_longitude   double precision,
  p_address     text,
  p_image_urls  text[],
  p_image_paths text[],
  p_idempotency_key text default null
)
returns public.complaints
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_complaint public.complaints;
  v_profile_id uuid;
  v_count int;
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

  -- Create the complaint with PostGIS geography location
  begin
    insert into public.complaints (user_id, category_id, title, description, severity, location, address, idempotency_key)
    values (
      v_profile_id,
      p_category_id,
      p_title,
      p_description,
      p_severity::public.complaint_severity,
      case
        when p_latitude is not null and p_longitude is not null
          then st_setsrid(st_point(p_longitude, p_latitude), 4326)::geography
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

-- Grant execute on the RPC to authenticated users (NOT anon — citizens must
-- be signed in to view the nearby map).
revoke execute on function public.create_complaint(uuid, text, text, text, double precision, double precision, text, text[], text[], text) from public, anon;
grant execute on function public.create_complaint(uuid, text, text, text, double precision, double precision, text, text[], text[], text) to authenticated;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.is_own_complaint(uuid) to authenticated;
