-- ============================================================================
-- JanMitra Database Setup - Step 16: Profile location + user preferences
-- ============================================================================
-- Adds the citizen-facing profile fields requested for the Profile Setup
-- feature:
--
--   1. Location      - city / ward (free text, optional)
--   2. Notifications - notify_push / notify_email / notify_in_app
--   3. Privacy       - privacy_show_leaderboard / privacy_show_ward
--
-- Every new column is nullable or has a `not null default`, so the ALTERs are
-- safe on a populated table and no backfill is needed. Defaults preserve the
-- current behaviour (everyone gets notifications and appears on the
-- leaderboard until they opt out).
--
-- RLS needs no change: "Users can update own profile" (03_rls_policies.sql)
-- already lets a citizen update their own row, and no other role can read
-- these columns except through the SECURITY DEFINER functions below.
--
-- Run after 15_unique_contacts.sql. Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Location
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists city text;

alter table public.profiles
  add column if not exists ward text;

comment on column public.profiles.city is
  'Optional city the citizen reports from; shown on their own profile only.';
comment on column public.profiles.ward is
  'Optional ward the citizen lives in; only exposed when privacy_show_ward.';

-- ----------------------------------------------------------------------------
-- 2. Notification preferences
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists notify_push boolean not null default true;

alter table public.profiles
  add column if not exists notify_email boolean not null default true;

alter table public.profiles
  add column if not exists notify_in_app boolean not null default true;

comment on column public.profiles.notify_push is
  'Citizen wants push notifications. Honoured by the app: when false the
   device token is not registered, so no push is delivered.';

-- ----------------------------------------------------------------------------
-- 3. Privacy settings
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists privacy_show_leaderboard boolean not null default true;

alter table public.profiles
  add column if not exists privacy_show_ward boolean not null default true;

comment on column public.profiles.privacy_show_leaderboard is
  'When false the citizen is excluded from community_leaderboard().';
comment on column public.profiles.privacy_show_ward is
  'When false the ward is hidden on the citizen''s own profile header.';

-- ----------------------------------------------------------------------------
-- 4. Honour privacy_show_leaderboard in the leaderboard RPC.
--
-- `create or replace` keeps the exact signature and return type of the
-- function defined in 11_similarity_and_leaderboard.sql; the grants at the
-- bottom are re-applied because replacing a function drops its privileges.
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
  where p.privacy_show_leaderboard
  order by p.points desc, p.created_at asc
  limit p_limit;
$$;

revoke all on function public.community_leaderboard(integer) from public, anon;
grant execute on function public.community_leaderboard(integer) to authenticated;

-- ----------------------------------------------------------------------------
-- Verify:
--   select city, ward, notify_push, notify_email, notify_in_app,
--          privacy_show_leaderboard, privacy_show_ward
--     from public.profiles where auth_user_id = auth.uid();
--   select rank, name, points, level, is_me from public.community_leaderboard(10);
-- ============================================================================
