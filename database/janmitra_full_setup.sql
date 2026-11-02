-- ============================================================================
-- JanMitra Database - FULL SETUP (All-in-One)
-- ============================================================================
-- Paste this entire file into the Supabase SQL Editor and click Run.
--   Dashboard > SQL Editor > New query > paste > Run
--
-- This script CLEANS UP any previous partial run, then creates everything
-- from scratch. Safe to re-run.
-- ============================================================================

-- Enable PostGIS
create extension if not exists postgis schema extensions;

-- ============================================================================
-- CLEANUP: drop everything from any previous (partial) run, in dependency
-- order. Triggers first, then tables (cascades to FKs), then types/seqs.
-- (DROP TRIGGER errors if the table is missing, so guard with DO blocks.)
-- ============================================================================
do $$ begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='complaints') then
    drop trigger if exists complaints_set_updated_at on public.complaints;
    drop trigger if exists complaints_award_points on public.complaints;
    drop trigger if exists complaints_create_initial_history on public.complaints;
    drop trigger if exists complaints_record_status_change on public.complaints;
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='profiles') then
    drop trigger if exists profiles_set_updated_at on public.profiles;
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='aadhaar_kyc') then
    drop trigger if exists aadhaar_kyc_set_updated_at on public.aadhaar_kyc;
  end if;
end $$;

-- on_auth_user_created is on auth.users which always exists
drop trigger if exists on_auth_user_created on auth.users;

-- FUNCTIONS are dropped before tables: create_complaint / join_similar_
-- complaint / add_evidence_to_complaint return public.complaints and would
-- otherwise block the table drop. Every function created below (core, 06
-- notifications, 07 reputation, 08 reputation API, 10 community
-- verification, 11 similarity/leaderboard) is dropped for a true re-run.
drop function if exists public.create_complaint(uuid, text, text, text, double precision, double precision, text, text[], text[]);
drop function if exists public.create_complaint(uuid, text, text, text, double precision, double precision, text, text[], text[], text);
drop function if exists public.join_similar_complaint(uuid, uuid, text, text, text, double precision, double precision, text, text[], text[], text);
drop function if exists public.add_evidence_to_complaint(uuid, text[], text[]);
drop function if exists public.find_similar_complaints(double precision, double precision, uuid, text, integer, integer);
drop function if exists public.community_leaderboard(integer);
drop function if exists public.nearby_complaints(double precision, double precision, integer, integer);
drop function if exists public.verifiable_complaints(double precision, double precision, integer, integer);
drop function if exists public.submit_community_verification(uuid, boolean, text);
drop function if exists public.get_reputation_summary();
drop function if exists public.community_complaint_stats();
drop function if exists public.award_points(uuid, text, uuid, text);
drop function if exists public.check_and_award_badges(uuid);
drop function if exists public.record_volunteer_activity(uuid, text);
drop function if exists public.protect_reputation_columns();
drop function if exists public.handle_complaint_report_points();
drop function if exists public.apply_status_rewards();
drop function if exists public.record_status_change();
drop function if exists public.create_initial_status_history();
drop function if exists public.award_complaint_points();
drop function if exists public.set_updated_at();
drop function if exists public.handle_new_user();
drop function if exists public.normalize_phone(text);
drop function if exists public.resolve_phone_login(text);
drop function if exists public.aadhaar_digits(text);
drop function if exists public.submit_aadhaar_registration(text, text);
drop function if exists public.is_own_complaint(uuid);
drop function if exists public.is_admin();
drop function if exists public.current_profile_id();
drop function if exists public.generate_complaint_number();
drop function if exists public.create_notification(uuid, text, text, text, uuid, jsonb);
drop function if exists public.notify_complaint_submitted();
drop function if exists public.notify_complaint_status_change();
drop function if exists public.notify_reward_earned();
drop function if exists public.notify_badge_earned();

drop table if exists public.notifications;
drop table if exists public.user_badges;
drop table if exists public.badges;
drop table if exists public.rewards;
drop table if exists public.reward_rules;
drop table if exists public.level_config;
drop table if exists public.complaint_status_history;
drop table if exists public.resolution_evidence;
drop table if exists public.community_verifications;
drop table if exists public.complaint_images;
drop table if exists public.complaints;
drop table if exists public.categories;
drop table if exists public.profiles;
drop table if exists public.aadhaar_kyc;

drop type if exists public.complaint_status;
drop type if exists public.complaint_severity;
drop sequence if exists public.complaint_number_seq;

-- Drop storage policies from any previous run. The bucket itself is left
-- in place (direct deletion from storage.buckets is blocked by Supabase).
-- If you need to remove the bucket, use the Dashboard > Storage UI.
drop policy if exists "Anyone can read complaint images" on storage.objects;
drop policy if exists "Authenticated users can upload complaint images" on storage.objects;
drop policy if exists "Users can delete own complaint images" on storage.objects;

-- ============================================================================
-- ENUMS
-- ============================================================================
create type public.complaint_severity as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
create type public.complaint_status as enum
  ('SUBMITTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- Sequence for complaint numbers
create sequence public.complaint_number_seq start 1;

-- ============================================================================
-- CORE FUNCTIONS (must exist before tables that reference them)
-- ============================================================================
create or replace function public.generate_complaint_number()
returns text language sql set search_path to 'public'
as $$
  select 'JM-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.complaint_number_seq')::text, 6, '0');
$$;

-- ============================================================================
-- TABLES
-- ============================================================================
create table if not exists public.profiles (
  id            uuid        not null default gen_random_uuid() primary key,
  auth_user_id  uuid        not null,
  name          text        not null,
  email         text,
  phone         text,
  avatar_url    text,
  points        integer     not null default 0  check (points >= 0),
  level         integer     not null default 1  check (level >= 1),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (auth_user_id),
  foreign key (auth_user_id) references auth.users (id) on delete cascade
);

create table if not exists public.categories (
  id          uuid        not null default gen_random_uuid() primary key,
  name        text        not null unique,
  description text,
  icon        text,
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.complaints (
  id               uuid              not null default gen_random_uuid() primary key,
  complaint_number text              not null default public.generate_complaint_number() unique,
  user_id          uuid              not null,
  category_id      uuid              not null,
  title            text              not null check (char_length(title) >= 3 and char_length(title) <= 200),
  description      text,
  severity         complaint_severity not null default 'MEDIUM'::complaint_severity,
  status           complaint_status  not null default 'SUBMITTED'::complaint_status,
  location         geography(point, 4326),
  address          text,
  created_at       timestamptz       not null default now(),
  updated_at       timestamptz       not null default now(),
  resolved_at      timestamptz,
  sla_deadline     timestamptz,
  -- Client-supplied idempotency key so network retries of the
  -- create_complaint / join_similar_complaint RPCs return the
  -- already-created complaint instead of creating a duplicate.
  idempotency_key  text,
  foreign key (user_id)     references public.profiles (id)  on delete cascade,
  foreign key (category_id) references public.categories (id) on delete restrict
);

create table if not exists public.complaint_images (
  id           uuid        not null default gen_random_uuid() primary key,
  complaint_id uuid        not null,
  storage_path text        not null,
  image_url    text        not null,
  created_at   timestamptz not null default now(),
  foreign key (complaint_id) references public.complaints (id) on delete cascade
);

create table if not exists public.complaint_status_history (
  id           uuid              not null default gen_random_uuid() primary key,
  complaint_id uuid              not null,
  status       complaint_status  not null,
  comment      text,
  updated_by   uuid,
  created_at   timestamptz       not null default now(),
  foreign key (complaint_id) references public.complaints (id) on delete cascade,
  foreign key (updated_by)  references auth.users (id) on delete set null
);

create table if not exists public.rewards (
  id            uuid        not null default gen_random_uuid() primary key,
  user_id       uuid        not null,
  complaint_id  uuid,
  activity_type text        not null,
  points        integer     not null default 0,
  description   text,
  created_at    timestamptz not null default now(),
  foreign key (user_id)      references public.profiles (id) on delete cascade,
  foreign key (complaint_id) references public.complaints (id) on delete set null
);

create table if not exists public.badges (
  id          uuid        not null default gen_random_uuid() primary key,
  name        text        not null unique,
  description text,
  icon        text,
  criteria    text,
  created_at  timestamptz not null default now()
);

create table if not exists public.user_badges (
  id        uuid        not null default gen_random_uuid() primary key,
  user_id   uuid        not null,
  badge_id  uuid        not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id),
  foreign key (user_id)  references public.profiles (id) on delete cascade,
  foreign key (badge_id) references public.badges (id)   on delete cascade
);

create table if not exists public.notifications (
  id           uuid        not null default gen_random_uuid() primary key,
  user_id      uuid        not null,
  title        text        not null,
  message      text        not null,
  type         text        not null,
  is_read      boolean     not null default false,
  read_at      timestamptz,
  complaint_id uuid,
  data         jsonb,
  push_sent    boolean     not null default false,
  created_at   timestamptz not null default now(),
  foreign key (user_id)      references public.profiles (id)   on delete cascade,
  foreign key (complaint_id) references public.complaints (id) on delete set null
);

create table if not exists public.device_tokens (
  id           uuid        not null default gen_random_uuid() primary key,
  user_id      uuid        not null,
  token        text        not null unique,
  platform     text        not null default 'unknown'
               check (platform in ('android', 'ios', 'web', 'unknown')),
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  foreign key (user_id) references public.profiles (id) on delete cascade
);

-- Indexes
create index if not exists complaints_user_id_idx         on public.complaints (user_id);
create index if not exists complaints_category_id_idx      on public.complaints (category_id);
create index if not exists complaints_status_idx           on public.complaints (status);
create index if not exists complaints_created_at_idx       on public.complaints (created_at desc);
create index if not exists complaints_location_gist_idx    on public.complaints using gist (location);
create unique index if not exists complaints_user_idempotency_uniq
  on public.complaints (user_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists complaint_images_complaint_idx  on public.complaint_images (complaint_id);
create index if not exists status_history_complaint_idx    on public.complaint_status_history (complaint_id);
create index if not exists rewards_user_id_idx             on public.rewards (user_id);
create index if not exists user_badges_user_id_idx         on public.user_badges (user_id);
create index if not exists notifications_user_id_idx       on public.notifications (user_id);
create index if not exists notifications_complaint_id_idx  on public.notifications (complaint_id);
create index if not exists notifications_unread_idx        on public.notifications (user_id) where is_read = false;
create index if not exists notifications_push_pending_idx  on public.notifications (created_at) where push_sent = false;
create index if not exists device_tokens_user_id_idx       on public.device_tokens (user_id);

-- ============================================================================
-- HELPER FUNCTIONS (for RLS policies)
-- ============================================================================
create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path to 'public'
as $$ select id from public.profiles where auth_user_id = auth.uid(); $$;

create or replace function public.is_own_complaint(c_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.complaints c
    where c.id = c_id
      and c.user_id = (select id from public.profiles where auth_user_id = auth.uid())
  );
$$;

-- Is the caller an admin? Used by the storage policies and by the
-- resolution_evidence admin-delete policy (10_community_verification.sql).
-- No roles table exists: admins are flagged via the JWT's app_metadata role
-- (Dashboard > Authentication > Users > user > app_metadata -> {"role": ...}).
create or replace function public.is_admin()
returns boolean language sql stable set search_path to 'public'
as $$
  select lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')) in
           ('admin', 'system_admin', 'department_admin', 'officer');
$$;

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  insert into public.profiles (auth_user_id, name, email, phone)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.email,
    public.normalize_phone(new.raw_user_meta_data->>'phone')
  );
  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path to 'public'
as $$ begin new.updated_at := now(); return new; end; $$;

create or replace function public.award_complaint_points()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  insert into public.rewards (user_id, complaint_id, activity_type, points, description)
  values (new.user_id, new.id, 'COMPLAINT_SUBMITTED', 10,
          'Points earned for reporting: ' || new.complaint_number);
  update public.profiles set points = points + 10 where id = new.user_id;
  return new;
end;
$$;

create or replace function public.create_initial_status_history()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_auth_user_id uuid;
begin
  select auth_user_id into v_auth_user_id from public.profiles where id = new.user_id;
  insert into public.complaint_status_history (complaint_id, status, comment, updated_by)
  values (new.id, new.status, 'Complaint submitted', v_auth_user_id);
  return new;
end;
$$;

create or replace function public.record_status_change()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if new.status is distinct from old.status then
    insert into public.complaint_status_history (complaint_id, status, comment, updated_by)
    values (new.id, new.status, null, auth.uid());
  end if;
  if new.status = 'RESOLVED' and old.status is distinct from 'RESOLVED' then
    new.resolved_at := now();
    -- Open community verification for the newly resolved complaint (the
    -- verification_status column is added by 10_community_verification.sql,
    -- appended at the end of this script).
    new.verification_status := 'pending';
  elsif new.status is distinct from 'RESOLVED' and old.status = 'RESOLVED' then
    new.resolved_at := null;
  end if;
  return new;
end;
$$;

-- ============================================================================
-- RPC: create_complaint (used by the mobile app)
-- p_idempotency_key: the mobile app sends a per-submission key so network
-- retries return the already-created complaint instead of a duplicate
-- (backed by complaints.idempotency_key + a partial unique index).
-- ============================================================================
create or replace function public.create_complaint(
  p_category_id uuid, p_title text, p_description text, p_severity text,
  p_latitude double precision, p_longitude double precision, p_address text,
  p_image_urls text[], p_image_paths text[], p_idempotency_key text default null
)
returns public.complaints language plpgsql security definer set search_path to 'public', 'extensions'
as $$
declare
  v_complaint public.complaints;
  v_profile_id uuid;
  v_count int;
begin
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

  begin
    insert into public.complaints (user_id, category_id, title, description, severity, location, address, idempotency_key)
    values (
      v_profile_id, p_category_id, p_title, p_description, p_severity::public.complaint_severity,
      case when p_latitude is not null and p_longitude is not null
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

  if p_image_urls is not null and array_length(p_image_urls, 1) > 0 then
    for v_count in 1..array_length(p_image_urls, 1) loop
      insert into public.complaint_images (complaint_id, storage_path, image_url)
      values (v_complaint.id, p_image_paths[v_count], p_image_urls[v_count]);
    end loop;
  end if;

  return v_complaint;
end;
$$;

-- Grants on functions
revoke execute on function public.create_complaint(uuid, text, text, text, double precision, double precision, text, text[], text[], text) from public, anon;
grant execute on function public.create_complaint(uuid, text, text, text, double precision, double precision, text, text[], text[], text) to authenticated;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.is_own_complaint(uuid) to authenticated;

-- ============================================================================
-- TRIGGERS
-- ============================================================================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists complaints_set_updated_at on public.complaints;
create trigger complaints_set_updated_at before update on public.complaints
  for each row execute function public.set_updated_at();

drop trigger if exists complaints_award_points on public.complaints;
create trigger complaints_award_points after insert on public.complaints
  for each row execute function public.award_complaint_points();

drop trigger if exists complaints_create_initial_history on public.complaints;
create trigger complaints_create_initial_history after insert on public.complaints
  for each row execute function public.create_initial_status_history();

drop trigger if exists complaints_record_status_change on public.complaints;
create trigger complaints_record_status_change before update of status on public.complaints
  for each row when (new.status is distinct from old.status)
  execute function public.record_status_change();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles                 enable row level security;
alter table public.categories               enable row level security;
alter table public.complaints               enable row level security;
alter table public.complaint_images         enable row level security;
alter table public.complaint_status_history enable row level security;
alter table public.rewards                  enable row level security;
alter table public.badges                   enable row level security;
alter table public.user_badges             enable row level security;
alter table public.notifications              enable row level security;
alter table public.device_tokens              enable row level security;

-- Profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select
  using (auth_user_id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert
  with check (auth_user_id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update
  using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

-- Categories
drop policy if exists "Active categories are publicly readable" on public.categories;
create policy "Active categories are publicly readable" on public.categories for select
  using (active = true);

-- Complaints
drop policy if exists "Citizens can view their own complaints" on public.complaints;
create policy "Citizens can view their own complaints" on public.complaints for select
  using (user_id = public.current_profile_id());

drop policy if exists "Authenticated users can view complaints for nearby visualization" on public.complaints;
create policy "Authenticated users can view complaints for nearby visualization" on public.complaints for select
  to authenticated using (true);

drop policy if exists "Citizens can create complaints for themselves" on public.complaints;
create policy "Citizens can create complaints for themselves" on public.complaints for insert
  with check (user_id = public.current_profile_id());

-- Complaint images
drop policy if exists "Authenticated users can view complaint images" on public.complaint_images;
create policy "Authenticated users can view complaint images" on public.complaint_images for select
  to authenticated using (true);

drop policy if exists "Citizens can add images to their own complaints" on public.complaint_images;
create policy "Citizens can add images to their own complaints" on public.complaint_images for insert
  with check (public.is_own_complaint(complaint_id));

-- Status history
drop policy if exists "Citizens can view their own complaint history" on public.complaint_status_history;
create policy "Citizens can view their own complaint history" on public.complaint_status_history for select
  using (public.is_own_complaint(complaint_id));

-- Rewards
drop policy if exists "Citizens can view their own rewards" on public.rewards;
create policy "Citizens can view their own rewards" on public.rewards for select
  using (user_id = public.current_profile_id());

-- Badges
drop policy if exists "Badges are publicly readable" on public.badges;
create policy "Badges are publicly readable" on public.badges for select
  using (true);

-- User badges
drop policy if exists "Citizens can view their own badges" on public.user_badges;
create policy "Citizens can view their own badges" on public.user_badges for select
  using (user_id = public.current_profile_id());

-- Notifications
drop policy if exists "Citizens can view their own notifications" on public.notifications;
create policy "Citizens can view their own notifications" on public.notifications for select
  using (user_id = public.current_profile_id());

drop policy if exists "Citizens can mark their own notifications as read" on public.notifications;
create policy "Citizens can mark their own notifications as read" on public.notifications for update
  using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());

-- No INSERT policy on notifications by design: rows are written only by
-- SECURITY DEFINER triggers (complaint lifecycle, rewards, badges).

-- Device tokens (FCM registration tokens)
drop policy if exists "Users can view own device tokens" on public.device_tokens;
create policy "Users can view own device tokens" on public.device_tokens for select
  using (user_id = public.current_profile_id());

drop policy if exists "Users can register own device tokens" on public.device_tokens;
create policy "Users can register own device tokens" on public.device_tokens for insert
  with check (user_id = public.current_profile_id());

drop policy if exists "Users can update own device tokens" on public.device_tokens;
create policy "Users can update own device tokens" on public.device_tokens for update
  using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());

drop policy if exists "Users can remove own device tokens" on public.device_tokens;
create policy "Users can remove own device tokens" on public.device_tokens for delete
  using (user_id = public.current_profile_id());

-- ============================================================================
-- STORAGE BUCKET & POLICIES
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('complaint_images', 'complaint_images', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can read complaint images" on storage.objects;
create policy "Anyone can read complaint images" on storage.objects for select
  using (bucket_id = 'complaint_images');

drop policy if exists "Authenticated users can upload complaint images" on storage.objects;
create policy "Authenticated users can upload complaint images" on storage.objects for insert
  to authenticated with check (bucket_id = 'complaint_images');

drop policy if exists "Users can delete own complaint images" on storage.objects;
create policy "Users can delete own complaint images" on storage.objects for delete
  using (bucket_id = 'complaint_images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Profile avatars (public read, owner-scoped writes)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can read avatars" on storage.objects;
create policy "Anyone can read avatars" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar" on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar" on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- SEED DATA (Categories & Badges)
-- ============================================================================
insert into public.categories (name, description, icon) values
  ('Damaged Public Infrastructure', 'Damaged public property and infrastructure', 'domain_disabled'),
  ('Garbage / Sanitation',           'Garbage, waste and sanitation issues',      'delete_outline'),
  ('Other',                          'Other civic issues',                         'category'),
  ('Pothole',                        'Potholes on roads and streets',              'report_problem'),
  ('Public Safety',                  'Public safety hazards and concerns',         'security'),
  ('Road Damage',                    'Damaged or broken road surfaces',            'add_road'),
  ('Stray Animals',                  'Stray animal issues in public areas',        'pets'),
  ('Streetlight',                    'Broken or non-functional streetlights',       'lightbulb_outline'),
  ('Unauthorized Construction',      'Illegal or unauthorized construction',       'engineering'),
  ('Water / Drainage',               'Water leakage, drainage and sewage issues',  'water_drop')
on conflict (name) do nothing;

insert into public.badges (name, description, icon, criteria) values
  ('First Report',            'Submitted your first civic complaint',          'flag',              'Submit 1 complaint'),
  ('Civic Starter',           'Submitted 5 civic complaints',                   'rocket_launch',      'Submit 5 complaints'),
  ('Neighborhood Helper',     'Submitted 10 complaints in your area',           'home',              'Submit 10 complaints'),
  ('Clean Streets Champion',  'Reported 5 garbage/sanitation issues',          'cleaning_services', 'Report 5 sanitation issues'),
  ('Consistent Citizen',       'Submitted complaints across 3 categories',      'star',              'Report in 3 different categories'),
  ('Community Watcher',        'Active for 30 days',                            'visibility',        'Be active for 30 days'),
  ('Verified Contributor',     'Had a complaint verified as resolved',         'verified',          'Get 1 complaint verified')
on conflict (name) do nothing;

-- ============================================================================
-- NOTIFICATIONS: helper + lifecycle triggers
-- ============================================================================
create or replace function public.create_notification(
  p_user_id uuid, p_title text, p_message text, p_type text,
  p_complaint_id uuid default null, p_data jsonb default null
)
returns uuid language plpgsql security definer set search_path to 'public'
as $$
declare v_id uuid;
begin
  if p_user_id is null then return null; end if;
  insert into public.notifications (user_id, title, message, type, complaint_id, data)
  values (p_user_id, p_title, p_message, p_type, p_complaint_id, p_data)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_notification(uuid, text, text, text, uuid, jsonb)
  from public, anon, authenticated;

create or replace function public.notify_complaint_submitted()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  perform public.create_notification(
    new.user_id,
    'Complaint Submitted',
    'Your complaint ' || new.complaint_number ||
      ' has been submitted successfully. Track its progress in the app.',
    'COMPLAINT_SUBMITTED', new.id,
    jsonb_build_object('complaint_id', new.id, 'complaint_number', new.complaint_number)
  );
  return new;
end;
$$;

drop trigger if exists complaints_notify_submitted on public.complaints;
create trigger complaints_notify_submitted
  after insert on public.complaints
  for each row execute function public.notify_complaint_submitted();

create or replace function public.notify_complaint_status_change()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  v_title text; v_message text; v_type text;
begin
  if new.status = old.status then return new; end if;
  if new.status = 'VERIFIED' then
    v_type := 'COMPLAINT_VERIFIED'; v_title := 'Complaint Verified';
    v_message := 'Your complaint ' || new.complaint_number || ' has been verified by our team.';
  elsif new.status = 'ASSIGNED' then
    v_type := 'COMPLAINT_ASSIGNED'; v_title := 'Complaint Assigned';
    v_message := 'Your complaint ' || new.complaint_number || ' has been assigned to the concerned department.';
  elsif new.status = 'IN_PROGRESS' then
    v_type := 'COMPLAINT_IN_PROGRESS'; v_title := 'Work In Progress';
    v_message := 'Work has started on your complaint ' || new.complaint_number || '.';
  elsif new.status = 'RESOLVED' then
    v_type := 'COMPLAINT_RESOLVED'; v_title := 'Complaint Resolved';
    v_message := 'Great news! Your complaint ' || new.complaint_number || ' has been resolved.';
  else
    return new;
  end if;
  perform public.create_notification(
    new.user_id, v_title, v_message, v_type, new.id,
    jsonb_build_object('complaint_id', new.id, 'complaint_number', new.complaint_number, 'status', new.status::text)
  );
  return new;
end;
$$;

drop trigger if exists complaints_notify_status_change on public.complaints;
create trigger complaints_notify_status_change
  after update of status on public.complaints
  for each row when (new.status is distinct from old.status)
  execute function public.notify_complaint_status_change();

create or replace function public.notify_reward_earned()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  perform public.create_notification(
    new.user_id,
    'Reward Earned',
    'You earned ' || new.points || ' point(s)' ||
      case when new.description is not null then ': ' || new.description else '.' end,
    'REWARD_EARNED', new.complaint_id,
    jsonb_build_object('points', new.points, 'activity_type', new.activity_type, 'complaint_id', new.complaint_id)
  );
  return new;
end;
$$;

drop trigger if exists rewards_notify_earned on public.rewards;
create trigger rewards_notify_earned
  after insert on public.rewards
  for each row execute function public.notify_reward_earned();

create or replace function public.notify_badge_earned()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_badge_name text;
begin
  select name into v_badge_name from public.badges where id = new.badge_id;
  perform public.create_notification(
    new.user_id,
    'Badge Earned',
    'You earned the ' || coalesce(v_badge_name, 'special') || ' badge! Keep up the great work.',
    'BADGE_EARNED', null,
    jsonb_build_object('badge_id', new.badge_id, 'badge_name', v_badge_name)
  );
  return new;
end;
$$;

drop trigger if exists user_badges_notify_earned on public.user_badges;
create trigger user_badges_notify_earned
  after insert on public.user_badges
  for each row execute function public.notify_badge_earned();

-- ============================================================================
-- INLINED BELOW: 07_reputation.sql -- Step 7: Civic Reputation Engine
-- (identical to the standalone file; inlined so this script is all-in-one)
-- ============================================================================

-- ============================================================================
-- JanMitra Database Setup - Step 7: Civic Reputation System
-- ============================================================================
-- Run after 01..06 (idempotent: safe to re-run, and safe on databases
-- created before this script existed).
--
-- What this creates:
--   * reward_rules   - configurable point values per activity (server-side)
--   * level_config   - configurable level thresholds + titles
--   * award_points() - the single SECURITY DEFINER point-award path; reads
--                      rules from the database (never hard-coded in the app)
--   * Triggers       - Valid report +50 / Verified +100 / Resolved +25 /
--                      Duplicate-or-fake -50, all via reward_rules
--   * check_and_award_badges() - badge criteria evaluated from badges.criteria
--   * record_volunteer_activity() RPC - +75 volunteer award (service_role only)
--   * profiles guard  - clients CANNOT update points/level directly
--
-- SECURITY MODEL (points cannot be manipulated by the mobile client):
--   1. rewards / user_badges have NO client INSERT/UPDATE policies (default
--      deny) - rows are written only by SECURITY DEFINER functions/triggers.
--   2. award_points() is revoked from anon/authenticated; only triggers
--      (running as owner) and service_role can execute it.
--   3. A BEFORE UPDATE trigger on profiles rejects any points/level change
--      unless the transaction-local GUC `janmitra.allow_reputation_write`
--      is set - which only server-side functions set.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. reward_rules: configurable point values per activity type
-- ----------------------------------------------------------------------------
create table if not exists public.reward_rules (
  activity_type text        not null primary key,
  title         text        not null,
  points        integer     not null,
  description   text,
  active        boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

insert into public.reward_rules (activity_type, title, points, description) values
  ('VALID_ISSUE_REPORT',        'Valid issue report',    50,  'Points for reporting a valid civic issue'),
  ('VERIFIED_REPORT',           'Verified report',      100,  'Points when your report is verified'),
  ('VOLUNTEER_ACTIVITY',        'Volunteer activity',    75,  'Points for volunteering in the community'),
  ('ISSUE_RESOLVED',            'Issue resolved',        25,  'Points when your reported issue is resolved'),
  ('DUPLICATE_OR_FAKE_REPORT',  'Duplicate/fake report', -50, 'Penalty for duplicate or fake reports')
on conflict (activity_type) do nothing;

-- ----------------------------------------------------------------------------
-- 2. level_config: configurable level thresholds + titles
-- ----------------------------------------------------------------------------
create table if not exists public.level_config (
  level      integer     not null primary key check (level >= 1),
  title      text        not null,
  min_points integer     not null check (min_points >= 0),
  created_at timestamptz not null default now()
);

insert into public.level_config (level, title, min_points) values
  (1, 'Civic Starter',      0),
  (2, 'Active Citizen',     100),
  (3, 'Community Helper',   300),
  (4, 'Civic Contributor',  600),
  (5, 'Civic Champion',     1000)
on conflict (level) do nothing;

alter table public.reward_rules enable row level security;
alter table public.level_config enable row level security;

drop policy if exists "Reward rules are readable" on public.reward_rules;
create policy "Reward rules are readable"
  on public.reward_rules for select
  to authenticated
  using (active = true);

drop policy if exists "Level config is readable" on public.level_config;
create policy "Level config is readable"
  on public.level_config for select
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- 3. Penalties: allow negative profile points (DUPLICATE_OR_FAKE -50)
-- ----------------------------------------------------------------------------
-- Allow negative totals so DUPLICATE_OR_FAKE_REPORT (-50) penalties work.
-- (Inline column checks are auto-named <table>_<column>_check.)
alter table public.profiles drop constraint if exists profiles_points_check;
-- NOTE: the `level >= 1` check already exists from 01_schema.sql (inline),
-- auto-named profiles_level_check. PostgreSQL's ALTER TABLE ADD CONSTRAINT
-- does not support IF NOT EXISTS, so it must not be re-added here.

-- History reads benefit from these.
create index if not exists rewards_user_created_idx  on public.rewards (user_id, created_at desc);
create index if not exists rewards_activity_type_idx on public.rewards (activity_type);

-- One award per complaint per activity (idempotent awarding).
drop index if exists public.rewards_complaint_activity_uniq;
create unique index if not exists rewards_complaint_activity_uniq
  on public.rewards (complaint_id, activity_type)
  where complaint_id is not null;

-- ----------------------------------------------------------------------------
-- 4. profiles guard: reject direct client edits of points/level
-- ----------------------------------------------------------------------------
create or replace function public.protect_reputation_columns()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.points is distinct from old.points
     and coalesce(current_setting('janmitra.allow_reputation_write', true), '') <> 'on' then
    raise exception 'points cannot be modified directly';
  end if;
  if new.level is distinct from old.level
     and coalesce(current_setting('janmitra.allow_reputation_write', true), '') <> 'on' then
    raise exception 'level cannot be modified directly';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_reputation on public.profiles;
create trigger profiles_protect_reputation
  before update on public.profiles
  for each row execute function public.protect_reputation_columns();

-- ----------------------------------------------------------------------------
-- 5. check_and_award_badges: criteria evaluated from badges.criteria JSON
--    e.g. {"metric": "reports", "count": 5}
--    metrics: reports | valid_reports | verified | resolved | volunteer
--             | points | level
-- ----------------------------------------------------------------------------
create or replace function public.check_and_award_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  b       record;
  crit    jsonb;
  v_metric text;
  v_needed integer;
  v_actual integer;
begin
  if p_user_id is null then
    return;
  end if;

  for b in select id, criteria from public.badges where criteria is not null loop
    begin
      crit := b.criteria::jsonb;
    exception when others then
      crit := null; -- legacy free-text criteria: not machine-evaluable
    end;

    if crit is null or coalesce(crit->>'metric', '') = '' then
      continue;
    end if;

    v_metric := crit->>'metric';
    v_needed  := coalesce((crit->>'count')::integer, 1);

    v_actual := case v_metric
      when 'reports' then
        (select count(*) from public.complaints where user_id = p_user_id)
      when 'valid_reports' then
        (select count(*) from public.rewards
          where user_id = p_user_id and activity_type = 'VALID_ISSUE_REPORT')
      when 'verified' then
        (select count(*) from public.rewards
          where user_id = p_user_id and activity_type = 'VERIFIED_REPORT')
      when 'resolved' then
        (select count(*) from public.rewards
          where user_id = p_user_id and activity_type = 'ISSUE_RESOLVED')
      when 'volunteer' then
        (select count(*) from public.rewards
          where user_id = p_user_id and activity_type = 'VOLUNTEER_ACTIVITY')
      when 'points' then
        (select points from public.profiles where id = p_user_id)
      when 'level' then
        (select level from public.profiles where id = p_user_id)
      else 0
    end;

    if v_actual >= v_needed then
      insert into public.user_badges (user_id, badge_id)
      values (p_user_id, b.id)
      on conflict (user_id, badge_id) do nothing;
    end if;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. award_points: THE single point-award path (rules-driven, server-side)
-- ----------------------------------------------------------------------------
create or replace function public.award_points(
  p_user_id      uuid,
  p_activity_type text,
  p_complaint_id uuid  default null,
  p_note         text  default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_rule       public.reward_rules%rowtype;
  v_reward_id  uuid;
begin
  if p_user_id is null then
    return null;
  end if;

  select * into v_rule
    from public.reward_rules
   where activity_type = p_activity_type
     and active = true;
  if not found then
    return null;
  end if;

  -- Idempotency: one award per complaint per activity type.
  if p_complaint_id is not null and exists (
    select 1 from public.rewards
     where complaint_id = p_complaint_id
       and activity_type = p_activity_type
  ) then
    return null;
  end if;

  insert into public.rewards (user_id, complaint_id, activity_type, points, description)
  values (p_user_id, p_complaint_id, p_activity_type, v_rule.points,
          coalesce(p_note, v_rule.description))
  returning id into v_reward_id;

  -- Allow the profiles points/level update inside this transaction only.
  perform set_config('janmitra.allow_reputation_write', 'on', true);

  update public.profiles p
     set points = p.points + v_rule.points,
         level = coalesce((
           select lc.level
             from public.level_config lc
            where lc.min_points <= p.points + v_rule.points
            order by lc.level desc
            limit 1
         ), 1),
         updated_at = now()
   where p.id = p_user_id;

  perform public.check_and_award_badges(p_user_id);

  return v_reward_id;
end;
$$;

-- Clients must never execute award_points directly.
revoke all on function public.award_points(uuid, text, uuid, text)
  from public, anon, authenticated;
revoke all on function public.check_and_award_badges(uuid)
  from public, anon, authenticated;
grant execute on function public.award_points(uuid, text, uuid, text) to service_role;

-- ----------------------------------------------------------------------------
-- 7. Trigger: Valid issue report (+50) on complaint insert
-- ----------------------------------------------------------------------------
drop trigger if exists complaints_award_points on public.complaints;
drop function if exists public.award_complaint_points();

create or replace function public.handle_complaint_report_points()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.award_points(
    new.user_id,
    'VALID_ISSUE_REPORT',
    new.id,
    'Valid issue report: ' || new.complaint_number
  );
  perform public.check_and_award_badges(new.user_id);
  return new;
end;
$$;

drop trigger if exists complaints_award_report_points on public.complaints;
create trigger complaints_award_report_points
  after insert on public.complaints
  for each row execute function public.handle_complaint_report_points();

-- ----------------------------------------------------------------------------
-- 8. Trigger: Verified +100 / Resolved +25 / Duplicate-fake -50
--    (REJECTED covers duplicate/fake reports; Supabase enum has no DUPLICATE)
-- ----------------------------------------------------------------------------
create or replace function public.apply_status_rewards()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'VERIFIED' then
    perform public.award_points(
      new.user_id, 'VERIFIED_REPORT', new.id,
      'Report verified: ' || new.complaint_number);
  elsif new.status = 'RESOLVED' then
    perform public.award_points(
      new.user_id, 'ISSUE_RESOLVED', new.id,
      'Issue resolved: ' || new.complaint_number);
  elsif new.status = 'REJECTED' then
    perform public.award_points(
      new.user_id, 'DUPLICATE_OR_FAKE_REPORT', new.id,
      'Duplicate or fake report penalty: ' || new.complaint_number);
  end if;

  perform public.check_and_award_badges(new.user_id);
  return new;
end;
$$;

drop trigger if exists complaints_apply_status_rewards on public.complaints;
create trigger complaints_apply_status_rewards
  after update of status on public.complaints
  for each row
  when (new.status is distinct from old.status)
  execute function public.apply_status_rewards();

-- ----------------------------------------------------------------------------
-- 9. RPC: record a volunteer activity (+75) - SERVICE ROLE ONLY.
--    Never granted to authenticated/anon: citizens cannot self-award.
-- ----------------------------------------------------------------------------
create or replace function public.record_volunteer_activity(
  p_user_id uuid,
  p_note    text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  return public.award_points(
    p_user_id,
    'VOLUNTEER_ACTIVITY',
    null,
    coalesce(p_note, 'Volunteer activity')
  );
end;
$$;

revoke all on function public.record_volunteer_activity(uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_volunteer_activity(uuid, text) to service_role;

-- ----------------------------------------------------------------------------
-- 10. Badge catalog: the six specified badges with machine-evaluable criteria
-- ----------------------------------------------------------------------------
update public.badges
   set description = 'Submitted your first civic issue',
       icon        = 'flag',
       criteria    = '{"metric":"reports","count":1}'
 where name = 'First Report';

insert into public.badges (name, description, icon, criteria) values
  ('Civic Watcher',      'Reported 5 civic issues',                     'visibility',   '{"metric":"reports","count":5}'),
  ('Community Helper',   'Reported 10 civic issues to your community',  'groups',       '{"metric":"reports","count":10}'),
  ('Problem Solver',     'Helped bring 3 issues to resolution',         'lightbulb',    '{"metric":"resolved","count":3}'),
  ('Civic Champion',     'Reached the highest civic level',             'emoji_events', '{"metric":"level","count":5}'),
  ('Trusted Citizen',    'Had 3 reports verified by the team',          'verified',     '{"metric":"verified","count":3}')
on conflict (name) do nothing;

-- Remove superseded legacy seed badges that were never earned.
delete from public.badges
 where name in ('Civic Starter', 'Neighborhood Helper', 'Clean Streets Champion',
                'Consistent Citizen', 'Community Watcher', 'Verified Contributor')
   and not exists (
     select 1 from public.user_badges ub where ub.badge_id = badges.id
   );

-- ----------------------------------------------------------------------------
-- 11. Reward notifications: handle penalties gracefully
-- ----------------------------------------------------------------------------
create or replace function public.notify_reward_earned()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_title   text;
  v_message text;
begin
  if new.points >= 0 then
    v_title   := 'Reward Earned';
    v_message := 'You earned ' || new.points || ' point(s)' ||
      case when new.description is not null then ': ' || new.description else '.' end;
  else
    v_title   := 'Points Deducted';
    v_message := abs(new.points) || ' point(s) deducted' ||
      case when new.description is not null then ': ' || new.description else '.' end;
  end if;

  perform public.create_notification(
    new.user_id,
    v_title,
    v_message,
    'REWARD_EARNED',
    new.complaint_id,
    jsonb_build_object(
      'points', new.points,
      'activity_type', new.activity_type,
      'complaint_id', new.complaint_id
    )
  );
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 12. Backfill: recompute levels for existing profiles from level_config
-- ----------------------------------------------------------------------------
-- The profiles_protect_reputation guard (section 4) rejects direct level
-- edits, so open the server-side escape hatch for this maintenance pass and
-- close it again immediately after. Session-level (is_local = false) so it
-- survives statement boundaries when this file is run statement-by-statement
-- (psql); a failing statement aborts the transaction in the SQL Editor, which
-- rolls the setting back automatically.
select set_config('janmitra.allow_reputation_write', 'on', false);

update public.profiles p
   set level = coalesce((
     select lc.level
       from public.level_config lc
      where lc.min_points <= p.points
      order by lc.level desc
      limit 1
   ), 1)
 where p.level is distinct from coalesce((
     select lc.level
       from public.level_config lc
      where lc.min_points <= p.points
      order by lc.level desc
      limit 1
   ), 1);

select set_config('janmitra.allow_reputation_write', '', false);

-- ----------------------------------------------------------------------------
-- Verify:
--   select activity_type, points from reward_rules;
--   select level, title, min_points from level_config order by level;
--   select name, criteria from badges order by name;
--   select proname from pg_proc where proname in
--     ('award_points', 'check_and_award_badges', 'record_volunteer_activity');
-- ----------------------------------------------------------------------------

-- ============================================================================
-- INLINED BELOW: 08_reputation_api.sql -- Step 8: Reputation Read API & Hardening
-- (identical to the standalone file; inlined so this script is all-in-one)
-- ============================================================================

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

-- ============================================================================
-- INLINED BELOW: 10_community_verification.sql -- Step 10: Community Verification & Resolution Evidence
-- (identical to the standalone file; inlined so this script is all-in-one)
-- ============================================================================

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

-- ============================================================================
-- INLINED BELOW: 11_similarity_and_leaderboard.sql -- Step 11: Similar-Report Detection & Community Leaderboard
-- (identical to the standalone file; inlined so this script is all-in-one)
-- ============================================================================

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


-- ============================================================================
-- JanMitra Database Setup - Step 12: Phone number as a login identifier
-- ============================================================================
-- Citizens may sign in with EITHER their email address or their mobile
-- number, plus the account password.
--
-- Supabase Auth only authenticates by email (or phone OTP), so a phone login
-- is resolved to the account's email first and then handed to
-- `signInWithPassword`. This file adds:
--
--   1. public.normalize_phone()  - canonical 10-digit form (see below)
--   2. a unique index            - one account per mobile number
--   3. public.resolve_phone_login() - phone -> email lookup for the app
--   4. handle_new_user() update  - stores the phone captured at signup
--
-- Run after 03_rls_policies.sql. Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Normalisation helper
--    Accepts "+91 98765-43210", "919876543210", "09876543210", "9876543210"
--    and returns "9876543210". Returns NULL when the input cannot be a
--    10-digit Indian mobile number.
-- ----------------------------------------------------------------------------
create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
parallel safe
set search_path to 'public'
as $$
  with d as (
    select regexp_replace(coalesce(p, ''), '\D', '', 'g') as digits
  )
  select case
    when length(digits) = 12 and left(digits, 2) = '91' then right(digits, 10)
    when length(digits) = 11 and left(digits, 1) = '0'  then right(digits, 10)
    when length(digits) = 10 then digits
    else null
  end
  from d;
$$;

-- ----------------------------------------------------------------------------
-- 2. One account per mobile number.
--    NULL / unparseable values are excluded so rows without a phone (or with
--    legacy free-form text) never block index creation.
--    NOTE: if the table already holds two rows sharing a mobile number the
--    index build fails - deduplicate those rows first.
-- ----------------------------------------------------------------------------
create unique index if not exists profiles_phone_normalized_uniq
  on public.profiles (public.normalize_phone(phone))
  where phone is not null;

-- ----------------------------------------------------------------------------
-- 3. Phone -> email lookup used by the mobile app's login screen.
--
--    SECURITY NOTE: this is a SECURITY DEFINER function granted to `anon`
--    because it must run before sign-in (RLS otherwise hides `profiles`).
--    It therefore lets a caller who already knows a mobile number learn the
--    e-mail address tied to it - the standard trade-off for password login
--    with a phone identifier. If that is unacceptable, replace it with an
--    Edge Function that rate-limits lookups, or switch phone login to OTP.
--    It returns the e-mail only; never the profile row or the phone itself.
-- ----------------------------------------------------------------------------
create or replace function public.resolve_phone_login(p_phone text)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.email
  from public.profiles p
  where public.normalize_phone(p.phone) = public.normalize_phone(p_phone)
    and p.email is not null
  limit 1;
$$;

revoke all on function public.resolve_phone_login(text) from public;
grant execute on function public.resolve_phone_login(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Capture the phone number supplied at signup.
--    `AuthRepository.signUp` passes it as `data.phone`, which lands in
--    auth.users.raw_user_meta_data. Re-declared here (CREATE OR REPLACE,
--    identical signature) so this file can run on databases where 02 has not
--    been re-applied since phone login shipped.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (auth_user_id, name, email, phone)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.email,
    public.normalize_phone(new.raw_user_meta_data->>'phone')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill phones already captured in auth metadata (no-op when profiles.phone
-- is already populated).
update public.profiles p
   set phone = public.normalize_phone(u.raw_user_meta_data->>'phone')
  from auth.users u
 where u.id = p.auth_user_id
   and p.phone is null
   and public.normalize_phone(u.raw_user_meta_data->>'phone') is not null;

-- ============================================================================
-- JanMitra Database Setup - Step 13: Aadhaar registration (identity gate)
-- ============================================================================
-- JanMitra flow: sign in with e-mail / mobile + password  ->  register Aadhaar
-- once  ->  only then can the citizen report, verify, claim rewards, etc.
--
-- This file adds:
--   1. public.aadhaar_kyc      - one row per citizen, created at registration
--   2. public.aadhaar_digits() - strips separators from a pasted Aadhaar
--   3. public.submit_aadhaar_registration() - the only write path (SECURITY
--      DEFINER): validates, stores a SHA-256 digest + masked number and marks
--      the row `verified`
--   4. RLS                    - citizens can read their own row only; all
--      writes go through the function above
--
-- Privacy: the raw Aadhaar number is NEVER stored. Only `sha256(digits)` and
-- the masked `XXXX XXXX 1234` form are kept, so the value cannot be
-- recovered from the database.
--
-- Run after 12_phone_login.sql. Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. pgcrypto supplies digest()/sha256. On Supabase it lives in `extensions`.
--    If it already exists in another schema this is a no-op and you may need
--    to adjust the schema-qualified call below.
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- ----------------------------------------------------------------------------
-- 1. Table
-- ----------------------------------------------------------------------------
create table if not exists public.aadhaar_kyc (
  id               uuid        not null default gen_random_uuid() primary key,
  auth_user_id     uuid        not null unique,
  aadhaar_hash     text        not null,
  aadhaar_masked   text        not null,
  full_name        text        not null check (char_length(btrim(full_name)) >= 3),
  status           text        not null default 'pending'
                   check (status in ('pending', 'verified', 'rejected')),
  verified_at      timestamptz,
  rejected_reason  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (auth_user_id) references auth.users (id) on delete cascade
);

create index if not exists aadhaar_kyc_status_idx
  on public.aadhaar_kyc (status)
  where status <> 'verified';

-- updated_at maintenance (function lives in 02_functions_triggers.sql).
drop trigger if exists aadhaar_kyc_set_updated_at on public.aadhaar_kyc;
create trigger aadhaar_kyc_set_updated_at
  before update on public.aadhaar_kyc
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. Normalisation helper
-- ----------------------------------------------------------------------------
create or replace function public.aadhaar_digits(p text)
returns text
language sql
immutable
parallel safe
set search_path to 'public'
as $$
  select regexp_replace(coalesce(p, ''), '\D', '', 'g');
$$;

-- ----------------------------------------------------------------------------
-- 3. Registration RPC - the single write path.
--
--    * requires an authenticated caller (auth.uid())
--    * requires exactly 12 digits and a usable full name
--    * first submission stores the digest / masked number and verifies it
--    * re-submission with the SAME Aadhaar only refreshes the display name
--    * re-submission with a DIFFERENT Aadhaar is rejected: an identity that
--      has already been registered cannot be swapped out
--
--    Auto-verification is intentional: there is no UIDAI API in this stack,
--    so format validation + uniqueness is the check performed here. Wire a
--    real KYC provider into this function (set status = 'pending', verify
--    server-side) when one becomes available.
-- ----------------------------------------------------------------------------
create or replace function public.submit_aadhaar_registration(
  p_aadhaar  text,
  p_full_name text
)
returns public.aadhaar_kyc
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_uid     uuid := auth.uid();
  v_digits  text := public.aadhaar_digits(p_aadhaar);
  v_name    text := btrim(coalesce(p_full_name, ''));
  v_hash    text;
  v_existing public.aadhaar_kyc;
  v_row     public.aadhaar_kyc;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if length(v_digits) <> 12 then
    raise exception 'invalid_aadhaar';
  end if;
  if length(v_name) < 3 then
    raise exception 'invalid_name';
  end if;

  v_hash := encode(digest(v_digits, 'sha256'), 'hex');

  select * into v_existing
    from public.aadhaar_kyc
   where auth_user_id = v_uid
   for update;

  if found then
    if v_existing.aadhaar_hash <> v_hash then
      raise exception 'aadhaar_already_registered';
    end if;
    update public.aadhaar_kyc
       set full_name  = v_name,
           updated_at = now()
     where id = v_existing.id
     returning * into v_row;
    return v_row;
  end if;

  insert into public.aadhaar_kyc (
    auth_user_id, aadhaar_hash, aadhaar_masked, full_name, status, verified_at
  ) values (
    v_uid, v_hash, 'XXXX XXXX ' || right(v_digits, 4), v_name, 'verified', now()
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.submit_aadhaar_registration(text, text) from public;
grant execute on function public.submit_aadhaar_registration(text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. RLS - citizens read their own row; no client-side writes at all.
-- ----------------------------------------------------------------------------
alter table public.aadhaar_kyc enable row level security;

drop policy if exists "Users can view own aadhaar kyc" on public.aadhaar_kyc;
create policy "Users can view own aadhaar kyc"
  on public.aadhaar_kyc for select
  to authenticated
  using (auth_user_id = auth.uid());

-- ============================================================================
-- JanMitra Database Setup - Step 15: One account per e-mail address
-- ============================================================================
-- Supabase Auth already refuses a second `auth.users` row for an address that
-- is already registered, but `public.profiles` is written by the
-- `handle_new_user` trigger and by service-role code paths where that check
-- does not apply. This enforces the rule in the database itself.
--
-- Run after 01_schema.sql. Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- One account per e-mail address.
--
-- `lower(btrim(...))` so "Aarav@Example.com" and "aarav@example.com" cannot
-- both be registered. The partial `where` clause excludes NULL e-mail rows
-- (legacy or phone-only profiles) so they never block index creation.
--
-- NOTE: if the table already holds two rows sharing an address the index
-- build fails - deduplicate those rows first. The index name is what the
-- app maps to `auth.error.accountExists`.
-- ----------------------------------------------------------------------------
create unique index if not exists profiles_email_uniq
  on public.profiles (lower(btrim(email)))
  where email is not null;

-- ============================================================================
-- DONE!
-- Create a demo user: Dashboard > Authentication > Users > Add user
-- Email: aarav@janmitra.example  Password: JanMitra123  (check Auto Confirm)
-- The handle_new_user trigger auto-creates the profile row.
-- ============================================================================
