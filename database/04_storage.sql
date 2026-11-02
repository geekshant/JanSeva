-- ============================================================================
-- JanMitra Database Setup - Step 4: Storage Bucket & Policies
-- ============================================================================
-- Run after 03_rls_policies.sql.
-- Creates a PRIVATE storage bucket for complaint images (photos may capture
-- private property or individuals) with owner-scoped policies, plus a public
-- avatars bucket with owner-scoped writes. Complaint images are displayed in
-- the app via short-lived signed URLs generated from the stored storage_path.
-- ============================================================================

-- Create the complaint_images storage bucket (PRIVATE; signed-URL access only)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('complaint_images', 'complaint_images', false,
        array['image/jpeg', 'image/png', 'image/webp'], 10485760)
on conflict (id) do update
  set public = excluded.public,
      allowed_mime_types = excluded.allowed_mime_types,
      file_size_limit = excluded.file_size_limit;

-- Create the avatars storage bucket (public profile photos)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('avatars', 'avatars', true,
        array['image/jpeg', 'image/png', 'image/webp'], 5242880)
on conflict (id) do update
  set public = excluded.public,
      allowed_mime_types = excluded.allowed_mime_types,
      file_size_limit = excluded.file_size_limit;

-- ----------------------------------------------------------------------------
-- Storage RLS Policies
-- ----------------------------------------------------------------------------

-- Owners can read their own complaint images (private bucket)
drop policy if exists "Anyone can read complaint images" on storage.objects;
drop policy if exists "Owners can read own complaint images" on storage.objects;
create policy "Owners can read own complaint images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'complaint_images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Admins (SYSTEM_ADMIN / DEPARTMENT_ADMIN / OFFICER) can read/download ALL
-- complaint image objects so the admin dashboard can generate signed URLs and
-- display evidence uploaded by citizens. OR'd with the owner policy above.
drop policy if exists "Admins can read all complaint images" on storage.objects;
create policy "Admins can read all complaint images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'complaint_images'
    and public.is_admin()
  );

-- Owners can upload complaint images into their own folder only
drop policy if exists "Authenticated users can upload complaint images" on storage.objects;
drop policy if exists "Owners can upload own complaint images" on storage.objects;
create policy "Owners can upload own complaint images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'complaint_images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Owners can delete their own complaint images (files are stored under
-- a path starting with their auth uid, e.g. "<uid>/timestamp_random.jpg")
drop policy if exists "Users can delete own complaint images" on storage.objects;
drop policy if exists "Owners can delete own complaint images" on storage.objects;
create policy "Owners can delete own complaint images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'complaint_images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Admins can delete any complaint image (e.g. officers removing an "after"
-- resolution photo), even when it was uploaded by a different admin.
drop policy if exists "Admins can delete complaint images" on storage.objects;
create policy "Admins can delete complaint images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'complaint_images'
    and public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- Avatars (profile photos)
-- ----------------------------------------------------------------------------

-- Anyone can read avatars (public bucket)
drop policy if exists "Anyone can read avatars" on storage.objects;
create policy "Anyone can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Users can upload only into their own avatar folder
drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Users can replace files in their own avatar folder
drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Users can delete their own avatar files
drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
