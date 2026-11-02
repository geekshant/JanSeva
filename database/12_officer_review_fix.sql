-- ===========================================================================
-- 12_officer_review_fix.sql
--
-- Fix the "Only officers can review complaints" authorization bug and add
-- structured decision reasons to the officer/admin review flow.
--
-- This migration:
--   1. Adds `review_reason_type` to `complaint_ai_verification` so the
--      machine-readable enum is stored separately from the human text.
--   2. Rewrites `officer_review_complaint` to authorize via `is_admin()` OR
--      an active officer row, validate structured reason types, record the
--      reviewer role, enrich the status-history comment, and guard against
--      stale (already-reviewed) complaints.
--   3. Fixes the RLS policies on `complaint_ai_verification` so admins
--      (not just officers-table rows) can read and update reviews.
--
-- Prerequisites: 01–11 (schema, functions, RLS, triggers).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Add `review_reason_type` column to `complaint_ai_verification`
-- ---------------------------------------------------------------------------
alter table public.complaint_ai_verification
  add column if not exists review_reason_type text;

comment on column public.complaint_ai_verification.review_reason_type is
  'Machine-readable reason category for the officer/admin review decision. '
  'For VERIFIED: evidence_match | ai_support | sufficient_evidence | details_consistent | other. '
  'For REJECTED: evidence_mismatch | category_mismatch | insufficient_evidence | duplicate | other. '
  'For EVIDENCE_REQUIRED: image_quality | missing_angles | not_visible | additional_required | other.';

-- ---------------------------------------------------------------------------
-- 2. Rewrite `officer_review_complaint`
-- ---------------------------------------------------------------------------
drop function if exists public.officer_review_complaint(uuid, text, text, text);

create or replace function public.officer_review_complaint(
  p_complaint_id uuid,
  p_decision text,
  p_reason text default null,
  p_evidence_message text default null,
  p_reason_type text default 'other'
) returns public.complaints
language plpgsql
security definer
set search_path = public
as $$
declare
  v_complaint public.complaints;
  v_new_status public.complaint_status;
  v_reviewer_id uuid;
  v_verification_id uuid;
  v_reviewer_role text;
  v_app_role text;
  v_is_officer boolean;
  v_reason_label text;
  v_is_authorized boolean;
begin
  -- -----------------------------------------------------------------------
  -- AUTHORIZATION: admins (via JWT) OR active officers in `officers` table.
  -- `is_admin()` checks JWT app_metadata/user_metadata for SYSTEM_ADMIN,
  -- DEPARTMENT_ADMIN or OFFICER. The officers-table check is a fallback for
  -- accounts that have an officer row but no JWT role claim.
  -- -----------------------------------------------------------------------
  v_reviewer_id := auth.uid();
  if v_reviewer_id is null then
    raise exception 'You must be signed in to review complaints';
  end if;

  v_is_officer := exists (
    select 1
    from public.officers o
    join public.profiles p on p.id = o.profile_id
    where p.auth_user_id = v_reviewer_id and o.active = true
  );

  v_is_authorized := public.is_admin() or v_is_officer;

  if not v_is_authorized then
    raise exception 'Only authorized admins and officers can review complaints';
  end if;

  -- Resolve the reviewer role for audit logging.
  v_app_role := coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  );
  if v_app_role in ('SYSTEM_ADMIN', 'DEPARTMENT_ADMIN') then
    v_reviewer_role := coalesce(v_app_role, 'ADMIN');
  elsif v_app_role in ('OFFICER', 'OFFICIAL') then
    v_reviewer_role := 'OFFICER';
  elsif v_is_officer then
    v_reviewer_role := 'OFFICER';
  else
    v_reviewer_role := 'ADMIN';
  end if;

  -- -----------------------------------------------------------------------
  -- VALIDATE the decision + reason type
  -- -----------------------------------------------------------------------
  if p_decision = 'VERIFIED' then
    v_new_status := 'VERIFIED'::public.complaint_status;
    if p_reason_type not in ('evidence_match', 'ai_support', 'sufficient_evidence', 'details_consistent', 'other') then
      raise exception 'Invalid reason type for verification';
    end if;
  elsif p_decision = 'REJECTED' then
    v_new_status := 'REJECTED'::public.complaint_status;
    if p_reason_type not in ('evidence_mismatch', 'category_mismatch', 'insufficient_evidence', 'duplicate', 'other') then
      raise exception 'Invalid reason type for rejection';
    end if;
  elsif p_decision = 'EVIDENCE_REQUIRED' then
    v_new_status := 'EVIDENCE_REQUIRED'::public.complaint_status;
    if p_reason_type not in ('image_quality', 'missing_angles', 'not_visible', 'additional_required', 'other') then
      raise exception 'Invalid reason type for evidence request';
    end if;
  else
    raise exception 'Invalid decision: must be VERIFIED, REJECTED, or EVIDENCE_REQUIRED';
  end if;

  -- When "other" is selected, a custom reason text is mandatory.
  if p_reason_type = 'other' and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'A custom reason is required when "Other" is selected';
  end if;

  -- -----------------------------------------------------------------------
  -- LOAD + GUARD the complaint (stale-review protection)
  -- -----------------------------------------------------------------------
  select * into v_complaint from public.complaints where id = p_complaint_id;
  if not found then
    raise exception 'Complaint not found';
  end if;

  -- If another admin/officer already moved the complaint past the reviewable
  -- states, reject the operation with an actionable message.
  if v_complaint.status in ('VERIFIED', 'REJECTED', 'RESOLVED', 'CLOSED') then
    raise exception 'This complaint has already been reviewed. Please refresh the page to see the latest status.';
  end if;

  -- -----------------------------------------------------------------------
  -- UPDATE the AI verification record FIRST so the guard trigger passes.
  -- -----------------------------------------------------------------------
  select id into v_verification_id
  from public.complaint_ai_verification
  where complaint_id = p_complaint_id
  order by created_at desc
  limit 1;

  if v_verification_id is not null then
    update public.complaint_ai_verification
    set reviewed_by = v_reviewer_id,
        reviewed_at = now(),
        review_decision = p_decision,
        review_reason = p_reason,
        review_reason_type = p_reason_type
    where id = v_verification_id;
  elsif p_decision = 'VERIFIED' then
    insert into public.complaint_ai_verification (
      complaint_id, status, selected_category, image_count,
      ai_decision, reason, reviewed_by, reviewed_at,
      review_decision, review_reason, review_reason_type
    )
    select
      p_complaint_id, 'completed', cat.name, 0,
      'PASS', 'Manual override — no AI check performed',
      v_reviewer_id, now(),
      'VERIFIED', p_reason, p_reason_type
    from public.categories cat
    where cat.id = v_complaint.category_id
    returning id into v_verification_id;
  end if;

  -- -----------------------------------------------------------------------
  -- UPDATE the complaint status (triggers record status history).
  -- -----------------------------------------------------------------------
  update public.complaints
  set status = v_new_status,
      evidence_request_message = case when p_decision = 'EVIDENCE_REQUIRED' then p_evidence_message else null end
  where id = p_complaint_id
  returning * into v_complaint;

  -- Enrich the status-history comment that the trigger just inserted.
  v_reason_label := case p_reason_type
    when 'evidence_match' then 'Evidence matches the reported issue'
    when 'ai_support' then 'AI analysis supports the complaint'
    when 'sufficient_evidence' then 'Images provide sufficient evidence'
    when 'details_consistent' then 'Complaint details and evidence are consistent'
    when 'evidence_mismatch' then 'Evidence does not support the complaint'
    when 'category_mismatch' then 'Complaint category does not match the evidence'
    when 'insufficient_evidence' then 'Insufficient evidence'
    when 'duplicate' then 'Duplicate complaint'
    when 'image_quality' then 'Image quality is insufficient'
    when 'missing_angles' then 'Required angles are missing'
    when 'not_visible' then 'Complaint is not clearly visible'
    when 'additional_required' then 'Additional evidence is required'
    else coalesce(p_reason, 'Not specified')
  end;

  update public.complaint_status_history
  set comment = 'Complaint ' || lower(p_decision) || ' by ' || v_reviewer_role
    || '. Reason: ' || v_reason_label
  where id = (
    select id from public.complaint_status_history
    where complaint_id = p_complaint_id
    order by created_at desc
    limit 1
  );

  -- -----------------------------------------------------------------------
  -- AUDIT LOG — record the full structured decision.
  -- -----------------------------------------------------------------------
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after)
  values (
    v_reviewer_id,
    'OFFICER_REVIEW',
    'complaint',
    p_complaint_id,
    jsonb_build_object(
      'decision', p_decision,
      'reason_type', p_reason_type,
      'reason_text', coalesce(p_reason, v_reason_label),
      'reviewer_role', v_reviewer_role,
      'complaint_number', v_complaint.complaint_number
    )
  );

  -- -----------------------------------------------------------------------
  -- NOTIFICATIONS (unchanged behaviour)
  -- -----------------------------------------------------------------------
  if p_decision = 'VERIFIED' then
    perform public.create_notification(v_complaint.user_id, 'Complaint Verified',
      'Your complaint ' || v_complaint.complaint_number || ' has been verified and forwarded for action.',
      'COMPLAINT_VERIFIED', p_complaint_id,
      jsonb_build_object('complaint_id', p_complaint_id, 'status', 'VERIFIED'));
  elsif p_decision = 'REJECTED' then
    perform public.create_notification(v_complaint.user_id, 'Complaint Rejected',
      'Your complaint ' || v_complaint.complaint_number || ' could not be verified. Reason: ' || coalesce(v_reason_label, 'Not specified'),
      'COMPLAINT_REJECTED', p_complaint_id,
      jsonb_build_object('complaint_id', p_complaint_id, 'status', 'REJECTED'));
  elsif p_decision = 'EVIDENCE_REQUIRED' then
    perform public.create_notification(v_complaint.user_id, 'More Evidence Needed',
      coalesce(p_evidence_message, 'Please upload additional photos showing the problem clearly from different angles.'),
      'EVIDENCE_REQUIRED', p_complaint_id,
      jsonb_build_object('complaint_id', p_complaint_id, 'status', 'EVIDENCE_REQUIRED'));
  end if;

  return v_complaint;
end;
$$;

comment on function public.officer_review_complaint(uuid, text, text, text, text) is
  'Reviews a complaint in AI_REVIEW_REQUIRED / EVIDENCE_REQUIRED status. '
  'Authorized for admins (SYSTEM_ADMIN / DEPARTMENT_ADMIN via JWT) and active '
  'officers. Stores a structured reason_type + reason_text, records the '
  'reviewer role, writes an audit log, and guards against stale reviews.';

-- ---------------------------------------------------------------------------
-- 3. Fix RLS policies on `complaint_ai_verification`
--    The old policies only allowed officers-table rows. Now use `is_admin()`
--    so SYSTEM_ADMIN / DEPARTMENT_ADMIN users can also read and update.
-- ---------------------------------------------------------------------------
drop policy if exists "Admins read all AI verification" on public.complaint_ai_verification;
drop policy if exists "Admins update AI verification reviews" on public.complaint_ai_verification;

create policy "Admins read all AI verification"
  on public.complaint_ai_verification
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins update AI verification reviews"
  on public.complaint_ai_verification
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
