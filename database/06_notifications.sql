-- ============================================================================
-- JanMitra Database Setup - Step 6: Notifications & Device Tokens
-- ============================================================================
-- Run after 01_schema.sql .. 05_seed_data.sql (idempotent: safe to re-run,
-- and safe on databases created before this script existed).
--
-- What this creates:
--   * notifications columns for complaint linking, read_at, FCM outbox
--   * device_tokens table (FCM registration tokens per authenticated user)
--   * RLS policies (read/update own notifications; own device tokens only)
--   * SECURITY DEFINER helper + triggers that create notifications for:
--       - Complaint Submitted / Verified / Assigned / In Progress / Resolved
--       - Reward Earned
--       - Badge Earned
--
-- Push delivery: rows are inserted here (persistent in-app notifications).
-- Actual FCM push sending happens in a trusted server environment only:
--   supabase/functions/send-push-notifications (Firebase credentials live
--   in Edge Function secrets, never in the Flutter app). The function drains
--   rows where push_sent = false and then marks them sent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. notifications: additive columns (for databases created with the old schema)
-- ----------------------------------------------------------------------------
alter table public.notifications
  add column if not exists read_at      timestamptz,
  add column if not exists complaint_id uuid references public.complaints (id) on delete set null,
  add column if not exists data         jsonb,
  add column if not exists push_sent    boolean not null default false;

create index if not exists notifications_complaint_id_idx  on public.notifications (complaint_id);
create index if not exists notifications_unread_idx        on public.notifications (user_id) where is_read = false;
create index if not exists notifications_push_pending_idx  on public.notifications (created_at) where push_sent = false;

-- ----------------------------------------------------------------------------
-- 2. device_tokens: FCM registration tokens, associated with the profile of
--    the authenticated user. RLS scopes every operation to own rows, so a
--    citizen can only register/remove their own devices.
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

create index if not exists device_tokens_user_id_idx on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

drop policy if exists "Users can view own device tokens" on public.device_tokens;
create policy "Users can view own device tokens"
  on public.device_tokens for select
  using (user_id = public.current_profile_id());

drop policy if exists "Users can register own device tokens" on public.device_tokens;
create policy "Users can register own device tokens"
  on public.device_tokens for insert
  with check (user_id = public.current_profile_id());

drop policy if exists "Users can update own device tokens" on public.device_tokens;
create policy "Users can update own device tokens"
  on public.device_tokens for update
  using (user_id = public.current_profile_id())
  with check (user_id = public.current_profile_id());

drop policy if exists "Users can remove own device tokens" on public.device_tokens;
create policy "Users can remove own device tokens"
  on public.device_tokens for delete
  using (user_id = public.current_profile_id());

-- ----------------------------------------------------------------------------
-- 3. notifications RLS (select/update own; NO client INSERT policy - by design)
-- ----------------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "Citizens can view their own notifications" on public.notifications;
create policy "Citizens can view their own notifications"
  on public.notifications for select
  using (user_id = public.current_profile_id());

drop policy if exists "Citizens can mark their own notifications as read" on public.notifications;
create policy "Citizens can mark their own notifications as read"
  on public.notifications for update
  using (user_id = public.current_profile_id())
  with check (user_id = public.current_profile_id());

-- ----------------------------------------------------------------------------
-- 4. SECURITY DEFINER helper: the single writer for notification rows
-- ----------------------------------------------------------------------------
create or replace function public.create_notification(
  p_user_id      uuid,
  p_title        text,
  p_message      text,
  p_type         text,
  p_complaint_id uuid default null,
  p_data         jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  if p_user_id is null then
    return null;
  end if;

  insert into public.notifications (user_id, title, message, type, complaint_id, data)
  values (p_user_id, p_title, p_message, p_type, p_complaint_id, p_data)
  returning id into v_id;

  return v_id;
end;
$$;

-- Never executable by API clients; only triggers (running as owner) call it.
revoke all on function public.create_notification(uuid, text, text, text, uuid, jsonb)
  from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. TRIGGER: Complaint Submitted (after insert)
-- ----------------------------------------------------------------------------
create or replace function public.notify_complaint_submitted()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.create_notification(
    new.user_id,
    'Complaint Submitted',
    'Your complaint ' || new.complaint_number ||
      ' has been submitted successfully. Track its progress in the app.',
    'COMPLAINT_SUBMITTED',
    new.id,
    jsonb_build_object(
      'complaint_id', new.id,
      'complaint_number', new.complaint_number
    )
  );
  return new;
end;
$$;

drop trigger if exists complaints_notify_submitted on public.complaints;
create trigger complaints_notify_submitted
  after insert on public.complaints
  for each row execute function public.notify_complaint_submitted();

-- ----------------------------------------------------------------------------
-- 6. TRIGGER: Verified / Assigned / In Progress / Resolved (status changes)
-- ----------------------------------------------------------------------------
create or replace function public.notify_complaint_status_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_title   text;
  v_message text;
  v_type    text;
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'VERIFIED' then
    v_type    := 'COMPLAINT_VERIFIED';
    v_title   := 'Complaint Verified';
    v_message := 'Your complaint ' || new.complaint_number ||
      ' has been verified by our team.';
  elsif new.status = 'ASSIGNED' then
    v_type    := 'COMPLAINT_ASSIGNED';
    v_title   := 'Complaint Assigned';
    v_message := 'Your complaint ' || new.complaint_number ||
      ' has been assigned to the concerned department.';
  elsif new.status = 'IN_PROGRESS' then
    v_type    := 'COMPLAINT_IN_PROGRESS';
    v_title   := 'Work In Progress';
    v_message := 'Work has started on your complaint ' || new.complaint_number || '.';
  elsif new.status = 'RESOLVED' then
    v_type    := 'COMPLAINT_RESOLVED';
    v_title   := 'Complaint Resolved';
    v_message := 'Great news! Your complaint ' || new.complaint_number ||
      ' has been resolved.';
  else
    return new; -- REJECTED (and any future statuses) do not notify
  end if;

  perform public.create_notification(
    new.user_id,
    v_title,
    v_message,
    v_type,
    new.id,
    jsonb_build_object(
      'complaint_id', new.id,
      'complaint_number', new.complaint_number,
      'status', new.status::text
    )
  );
  return new;
end;
$$;

drop trigger if exists complaints_notify_status_change on public.complaints;
create trigger complaints_notify_status_change
  after update of status on public.complaints
  for each row
  when (new.status is distinct from old.status)
  execute function public.notify_complaint_status_change();

-- ----------------------------------------------------------------------------
-- 7. TRIGGER: Reward Earned (after insert on rewards)
-- ----------------------------------------------------------------------------
create or replace function public.notify_reward_earned()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.create_notification(
    new.user_id,
    'Reward Earned',
    'You earned ' || new.points || ' point(s)' ||
      case when new.description is not null then ': ' || new.description else '.' end,
    'REWARD_EARNED',
    new.complaint_id,
    jsonb_build_object(
      'points', new.points,
      'activity_type', new.activity_type,
      'complaint_id', new.complaint_id
    )
  );
  return new;
end;
$$;

drop trigger if exists rewards_notify_earned on public.rewards;
create trigger rewards_notify_earned
  after insert on public.rewards
  for each row execute function public.notify_reward_earned();

-- ----------------------------------------------------------------------------
-- 8. TRIGGER: Badge Earned (after insert on user_badges)
-- ----------------------------------------------------------------------------
create or replace function public.notify_badge_earned()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_badge_name text;
begin
  select name into v_badge_name from public.badges where id = new.badge_id;

  perform public.create_notification(
    new.user_id,
    'Badge Earned',
    'You earned the ' || coalesce(v_badge_name, 'special') || ' badge! Keep up the great work.',
    'BADGE_EARNED',
    null,
    jsonb_build_object(
      'badge_id', new.badge_id,
      'badge_name', v_badge_name
    )
  );
  return new;
end;
$$;

drop trigger if exists user_badges_notify_earned on public.user_badges;
create trigger user_badges_notify_earned
  after insert on public.user_badges
  for each row execute function public.notify_badge_earned();

-- ----------------------------------------------------------------------------
-- Done. Verify with:
--   select proname from pg_proc
--     where pronamespace = 'public'::regnamespace
--       and proname in ('create_notification', 'notify_complaint_submitted',
--                       'notify_complaint_status_change', 'notify_reward_earned',
--                       'notify_badge_earned');
--   select tgname from pg_trigger where tgrelid = 'public.complaints'::regclass;
-- ----------------------------------------------------------------------------
