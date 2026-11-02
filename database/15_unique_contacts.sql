-- ============================================================================
-- JanMitra Database Setup - Step 15: One account per e-mail address
-- ============================================================================
-- Supabase Auth already refuses a second `auth.users` row for an address that
-- is already registered, but `public.profiles` is written by the
-- `handle_new_user` trigger and by service-role code paths where that check
-- does not apply. This file enforces the rule in the database itself.
--
--   1. a unique index - one profile per e-mail address (case-insensitive)
--
-- Mobile numbers are already covered by `12_phone_login.sql`
-- (`profiles_phone_normalized_uniq`), so after 12 + 15 an address and a
-- mobile number can each belong to at most one account.
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
