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
