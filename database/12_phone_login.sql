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
