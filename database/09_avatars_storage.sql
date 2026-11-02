-- ============================================================================
-- JanMitra Database Setup - Step 9: Profile Avatars Storage Bucket
-- ============================================================================
-- Run after 08_reputation_api.sql (or after 04_storage.sql on older installs).
-- Creates a public storage bucket for profile avatars with owner-scoped
-- upload/update/delete policies (path must start with the caller's auth uid).
-- Idempotent — safe to re-run.
-- ============================================================================

-- Public-read bucket for profile photos (avatar_url is a public CDN URL).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Storage RLS Policies
-- ----------------------------------------------------------------------------

-- Anyone can read avatars (public bucket).
drop policy if exists "Anyone can read avatars" on storage.objects;
create policy "Anyone can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Authenticated users can upload only into their own folder
-- (e.g. "<auth_uid>/avatar_169....jpg").
drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can replace files in their own folder.
drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatar files.
drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
