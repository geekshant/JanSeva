-- ============================================================================
-- JanMitra Database Setup - Step 1: Extensions, Enums, Tables & Constraints
-- ============================================================================
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- This file creates the full table schema. Run 02_functions_triggers.sql,
-- 03_rls_policies.sql, 04_storage.sql, and 05_seed_data.sql after this one.
-- ============================================================================

-- Enable PostGIS (required for complaint locations)
create extension if not exists postgis schema extensions;

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- (CREATE TYPE does not support IF NOT EXISTS, so we guard with DO blocks)
-- ----------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'complaint_severity') then
    create type public.complaint_severity as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'complaint_status') then
    create type public.complaint_status as enum
      ('SUBMITTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- SEQUENCE for complaint numbers
-- ----------------------------------------------------------------------------
create sequence if not exists public.complaint_number_seq start 1;

-- ----------------------------------------------------------------------------
-- HELPER: generate complaint number (JM-YYYY-000001 format)
-- Defined here as well as in 02_functions_triggers.sql so this file can run
-- standalone: the complaints table below uses it as a column default, and a
-- column default must resolve at CREATE TABLE time. Both definitions are
-- CREATE OR REPLACE with an identical signature, so there is never a
-- duplicate or conflicting definition.
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
-- PROFILES
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- CATEGORIES
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid        not null default gen_random_uuid() primary key,
  name        text        not null unique,
  description text,
  icon        text,
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- COMPLAINTS
-- ----------------------------------------------------------------------------
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
  foreign key (user_id)     references public.profiles (id)  on delete cascade,
  foreign key (category_id) references public.categories (id) on delete restrict
);

-- ----------------------------------------------------------------------------
-- COMPLAINTS: client-supplied idempotency key so network retries of the
-- create_complaint / join_similar_complaint RPCs return the already-created
-- complaint instead of creating a duplicate (see 02_functions_triggers.sql
-- and 11_similarity_and_leaderboard.sql).
-- ----------------------------------------------------------------------------
alter table public.complaints
  add column if not exists idempotency_key text;

create unique index if not exists complaints_user_idempotency_uniq
  on public.complaints (user_id, idempotency_key)
  where idempotency_key is not null;

-- ----------------------------------------------------------------------------
-- COMPLAINT IMAGES
-- ----------------------------------------------------------------------------
create table if not exists public.complaint_images (
  id           uuid        not null default gen_random_uuid() primary key,
  complaint_id uuid        not null,
  storage_path text        not null,
  image_url    text        not null,
  created_at   timestamptz not null default now(),
  foreign key (complaint_id) references public.complaints (id) on delete cascade
);

-- ----------------------------------------------------------------------------
-- COMPLAINT STATUS HISTORY
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- REWARDS
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- BADGES
-- ----------------------------------------------------------------------------
create table if not exists public.badges (
  id          uuid        not null default gen_random_uuid() primary key,
  name        text        not null unique,
  description text,
  icon        text,
  criteria    text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- USER BADGES
-- ----------------------------------------------------------------------------
create table if not exists public.user_badges (
  id        uuid        not null default gen_random_uuid() primary key,
  user_id   uuid        not null,
  badge_id  uuid        not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id),
  foreign key (user_id)  references public.profiles (id) on delete cascade,
  foreign key (badge_id) references public.badges (id)   on delete cascade
);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- DEVICE TOKENS (FCM registration tokens per device, owned by a profile)
-- ----------------------------------------------------------------------------
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

-- Useful indexes
create index if not exists complaints_user_id_idx        on public.complaints (user_id);
create index if not exists complaints_category_id_idx     on public.complaints (category_id);
create index if not exists complaints_status_idx          on public.complaints (status);
create index if not exists complaints_created_at_idx      on public.complaints (created_at desc);
create index if not exists complaints_location_gist_idx   on public.complaints using gist (location);
create index if not exists complaint_images_complaint_idx on public.complaint_images (complaint_id);
create index if not exists status_history_complaint_idx   on public.complaint_status_history (complaint_id);
create index if not exists rewards_user_id_idx            on public.rewards (user_id);
create index if not exists user_badges_user_id_idx       on public.user_badges (user_id);
create index if not exists notifications_user_id_idx     on public.notifications (user_id);
create index if not exists notifications_complaint_id_idx on public.notifications (complaint_id);
create index if not exists notifications_unread_idx      on public.notifications (user_id) where is_read = false;
create index if not exists notifications_push_pending_idx on public.notifications (created_at) where push_sent = false;
create index if not exists device_tokens_user_id_idx     on public.device_tokens (user_id);
