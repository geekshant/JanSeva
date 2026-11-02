-- ============================================================================
-- Migration 17: Add gender column + update handle_new_user trigger
-- ============================================================================
-- Adds a `gender` column with a CHECK constraint for valid values.
-- Updates handle_new_user() to also persist phone, gender, and preferred_language
-- from the Supabase Auth raw_user_meta_data sent at signup time.
-- The `preferred_language` column already exists on the live profiles table.
-- Applied: 2026-09-30
-- ============================================================================

-- 1. Add gender column with CHECK constraint
alter table public.profiles
  add column if not exists gender text
  check (gender is null or gender in ('female', 'male', 'other', 'prefer_not_to_say'));

comment on column public.profiles.gender is
  'User gender: female | male | other | prefer_not_to_say. Used for Women Safety SOS eligibility (female only). Never exposed in public views.';

-- 2. Update handle_new_user to store phone, gender, preferred_language
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (auth_user_id, name, email, phone, gender, preferred_language)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.email,
    public.normalize_phone(new.raw_user_meta_data->>'phone'),
    new.raw_user_meta_data->>'gender',
    new.raw_user_meta_data->>'preferred_language'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
