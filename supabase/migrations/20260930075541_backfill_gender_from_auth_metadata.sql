-- ============================================================================
-- Backfill profiles.gender from auth.users.raw_user_meta_data
-- ============================================================================
-- The `gender` column was added in migration 17 (add_gender_and_update_profile
-- _trigger), and the handle_new_user trigger now stores it for new signups.
-- But users who registered BEFORE that migration have gender = NULL in their
-- profile, even though some may have gender in their auth metadata (if they
-- re-registered or updated their metadata after the column was added).
--
-- This backfill copies gender from raw_user_meta_data into profiles.gender
-- for every profile where gender is NULL but the metadata has a valid value.
-- Only valid CHECK-constraint values are accepted (female | male | other |
-- prefer_not_to_say) so a malformed metadata entry can't corrupt the column.
-- ============================================================================

update public.profiles p
   set gender = u.raw_user_meta_data->>'gender'
  from auth.users u
 where u.id = p.auth_user_id
   and p.gender is null
   and u.raw_user_meta_data->>'gender' in
       ('female', 'male', 'other', 'prefer_not_to_say');
