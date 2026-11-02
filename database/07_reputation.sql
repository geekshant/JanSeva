-- ============================================================================
-- JanMitra Database Setup - Step 7: Civic Reputation System
-- ============================================================================
-- Run after 01..06 (idempotent: safe to re-run, and safe on databases
-- created before this script existed).
--
-- What this creates:
--   * reward_rules   - configurable point values per activity (server-side)
--   * level_config   - configurable level thresholds + titles
--   * award_points() - the single SECURITY DEFINER point-award path; reads
--                      rules from the database (never hard-coded in the app)
--   * Triggers       - Valid report +50 / Verified +100 / Resolved +25 /
--                      Duplicate-or-fake -50, all via reward_rules
--   * check_and_award_badges() - badge criteria evaluated from badges.criteria
--   * record_volunteer_activity() RPC - +75 volunteer award (service_role only)
--   * profiles guard  - clients CANNOT update points/level directly
--
-- SECURITY MODEL (points cannot be manipulated by the mobile client):
--   1. rewards / user_badges have NO client INSERT/UPDATE policies (default
--      deny) - rows are written only by SECURITY DEFINER functions/triggers.
--   2. award_points() is revoked from anon/authenticated; only triggers
--      (running as owner) and service_role can execute it.
--   3. A BEFORE UPDATE trigger on profiles rejects any points/level change
--      unless the transaction-local GUC `janmitra.allow_reputation_write`
--      is set - which only server-side functions set.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. reward_rules: configurable point values per activity type
-- ----------------------------------------------------------------------------
create table if not exists public.reward_rules (
  activity_type text        not null primary key,
  title         text        not null,
  points        integer     not null,
  description   text,
  active        boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

insert into public.reward_rules (activity_type, title, points, description) values
  ('VALID_ISSUE_REPORT',        'Valid issue report',    50,  'Points for reporting a valid civic issue'),
  ('VERIFIED_REPORT',           'Verified report',      100,  'Points when your report is verified'),
  ('VOLUNTEER_ACTIVITY',        'Volunteer activity',    75,  'Points for volunteering in the community'),
  ('ISSUE_RESOLVED',            'Issue resolved',        25,  'Points when your reported issue is resolved'),
  ('DUPLICATE_OR_FAKE_REPORT',  'Duplicate/fake report', -50, 'Penalty for duplicate or fake reports')
on conflict (activity_type) do nothing;

-- ----------------------------------------------------------------------------
-- 2. level_config: configurable level thresholds + titles
-- ----------------------------------------------------------------------------
create table if not exists public.level_config (
  level      integer     not null primary key check (level >= 1),
  title      text        not null,
  min_points integer     not null check (min_points >= 0),
  created_at timestamptz not null default now()
);

insert into public.level_config (level, title, min_points) values
  (1, 'Civic Starter',      0),
  (2, 'Active Citizen',     100),
  (3, 'Community Helper',   300),
  (4, 'Civic Contributor',  600),
  (5, 'Civic Champion',     1000)
on conflict (level) do nothing;

alter table public.reward_rules enable row level security;
alter table public.level_config enable row level security;

drop policy if exists "Reward rules are readable" on public.reward_rules;
create policy "Reward rules are readable"
  on public.reward_rules for select
  to authenticated
  using (active = true);

drop policy if exists "Level config is readable" on public.level_config;
create policy "Level config is readable"
  on public.level_config for select
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- 3. Penalties: allow negative profile points (DUPLICATE_OR_FAKE -50)
-- ----------------------------------------------------------------------------
-- Allow negative totals so DUPLICATE_OR_FAKE_REPORT (-50) penalties work.
-- (Inline column checks are auto-named <table>_<column>_check.)
alter table public.profiles drop constraint if exists profiles_points_check;
-- NOTE: the `level >= 1` check already exists from 01_schema.sql (inline),
-- auto-named profiles_level_check. PostgreSQL's ALTER TABLE ADD CONSTRAINT
-- does not support IF NOT EXISTS, so it must not be re-added here.

-- History reads benefit from these.
create index if not exists rewards_user_created_idx  on public.rewards (user_id, created_at desc);
create index if not exists rewards_activity_type_idx on public.rewards (activity_type);

-- One award per complaint per activity (idempotent awarding).
drop index if exists public.rewards_complaint_activity_uniq;
create unique index if not exists rewards_complaint_activity_uniq
  on public.rewards (complaint_id, activity_type)
  where complaint_id is not null;

-- ----------------------------------------------------------------------------
-- 4. profiles guard: reject direct client edits of points/level
-- ----------------------------------------------------------------------------
create or replace function public.protect_reputation_columns()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.points is distinct from old.points
     and coalesce(current_setting('janmitra.allow_reputation_write', true), '') <> 'on' then
    raise exception 'points cannot be modified directly';
  end if;
  if new.level is distinct from old.level
     and coalesce(current_setting('janmitra.allow_reputation_write', true), '') <> 'on' then
    raise exception 'level cannot be modified directly';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_reputation on public.profiles;
create trigger profiles_protect_reputation
  before update on public.profiles
  for each row execute function public.protect_reputation_columns();

-- ----------------------------------------------------------------------------
-- 5. check_and_award_badges: criteria evaluated from badges.criteria JSON
--    e.g. {"metric": "reports", "count": 5}
--    metrics: reports | valid_reports | verified | resolved | volunteer
--             | points | level
-- ----------------------------------------------------------------------------
create or replace function public.check_and_award_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  b       record;
  crit    jsonb;
  v_metric text;
  v_needed integer;
  v_actual integer;
begin
  if p_user_id is null then
    return;
  end if;

  for b in select id, criteria from public.badges where criteria is not null loop
    begin
      crit := b.criteria::jsonb;
    exception when others then
      crit := null; -- legacy free-text criteria: not machine-evaluable
    end;

    if crit is null or coalesce(crit->>'metric', '') = '' then
      continue;
    end if;

    v_metric := crit->>'metric';
    v_needed  := coalesce((crit->>'count')::integer, 1);

    v_actual := case v_metric
      when 'reports' then
        (select count(*) from public.complaints where user_id = p_user_id)
      when 'valid_reports' then
        (select count(*) from public.rewards
          where user_id = p_user_id and activity_type = 'VALID_ISSUE_REPORT')
      when 'verified' then
        (select count(*) from public.rewards
          where user_id = p_user_id and activity_type = 'VERIFIED_REPORT')
      when 'resolved' then
        (select count(*) from public.rewards
          where user_id = p_user_id and activity_type = 'ISSUE_RESOLVED')
      when 'volunteer' then
        (select count(*) from public.rewards
          where user_id = p_user_id and activity_type = 'VOLUNTEER_ACTIVITY')
      when 'points' then
        (select points from public.profiles where id = p_user_id)
      when 'level' then
        (select level from public.profiles where id = p_user_id)
      else 0
    end;

    if v_actual >= v_needed then
      insert into public.user_badges (user_id, badge_id)
      values (p_user_id, b.id)
      on conflict (user_id, badge_id) do nothing;
    end if;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. award_points: THE single point-award path (rules-driven, server-side)
-- ----------------------------------------------------------------------------
create or replace function public.award_points(
  p_user_id      uuid,
  p_activity_type text,
  p_complaint_id uuid  default null,
  p_note         text  default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_rule       public.reward_rules%rowtype;
  v_reward_id  uuid;
begin
  if p_user_id is null then
    return null;
  end if;

  select * into v_rule
    from public.reward_rules
   where activity_type = p_activity_type
     and active = true;
  if not found then
    return null;
  end if;

  -- Idempotency: one award per complaint per activity type.
  if p_complaint_id is not null and exists (
    select 1 from public.rewards
     where complaint_id = p_complaint_id
       and activity_type = p_activity_type
  ) then
    return null;
  end if;

  insert into public.rewards (user_id, complaint_id, activity_type, points, description)
  values (p_user_id, p_complaint_id, p_activity_type, v_rule.points,
          coalesce(p_note, v_rule.description))
  returning id into v_reward_id;

  -- Allow the profiles points/level update inside this transaction only.
  perform set_config('janmitra.allow_reputation_write', 'on', true);

  update public.profiles p
     set points = p.points + v_rule.points,
         level = coalesce((
           select lc.level
             from public.level_config lc
            where lc.min_points <= p.points + v_rule.points
            order by lc.level desc
            limit 1
         ), 1),
         updated_at = now()
   where p.id = p_user_id;

  perform public.check_and_award_badges(p_user_id);

  return v_reward_id;
end;
$$;

-- Clients must never execute award_points directly.
revoke all on function public.award_points(uuid, text, uuid, text)
  from public, anon, authenticated;
revoke all on function public.check_and_award_badges(uuid)
  from public, anon, authenticated;
grant execute on function public.award_points(uuid, text, uuid, text) to service_role;

-- ----------------------------------------------------------------------------
-- 7. Trigger: Valid issue report (+50) on complaint insert
-- ----------------------------------------------------------------------------
drop trigger if exists complaints_award_points on public.complaints;
drop function if exists public.award_complaint_points();

create or replace function public.handle_complaint_report_points()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.award_points(
    new.user_id,
    'VALID_ISSUE_REPORT',
    new.id,
    'Valid issue report: ' || new.complaint_number
  );
  perform public.check_and_award_badges(new.user_id);
  return new;
end;
$$;

drop trigger if exists complaints_award_report_points on public.complaints;
create trigger complaints_award_report_points
  after insert on public.complaints
  for each row execute function public.handle_complaint_report_points();

-- ----------------------------------------------------------------------------
-- 8. Trigger: Verified +100 / Resolved +25 / Duplicate-fake -50
--    (REJECTED covers duplicate/fake reports; Supabase enum has no DUPLICATE)
-- ----------------------------------------------------------------------------
create or replace function public.apply_status_rewards()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'VERIFIED' then
    perform public.award_points(
      new.user_id, 'VERIFIED_REPORT', new.id,
      'Report verified: ' || new.complaint_number);
  elsif new.status = 'RESOLVED' then
    perform public.award_points(
      new.user_id, 'ISSUE_RESOLVED', new.id,
      'Issue resolved: ' || new.complaint_number);
  elsif new.status = 'REJECTED' then
    perform public.award_points(
      new.user_id, 'DUPLICATE_OR_FAKE_REPORT', new.id,
      'Duplicate or fake report penalty: ' || new.complaint_number);
  end if;

  perform public.check_and_award_badges(new.user_id);
  return new;
end;
$$;

drop trigger if exists complaints_apply_status_rewards on public.complaints;
create trigger complaints_apply_status_rewards
  after update of status on public.complaints
  for each row
  when (new.status is distinct from old.status)
  execute function public.apply_status_rewards();

-- ----------------------------------------------------------------------------
-- 9. RPC: record a volunteer activity (+75) - SERVICE ROLE ONLY.
--    Never granted to authenticated/anon: citizens cannot self-award.
-- ----------------------------------------------------------------------------
create or replace function public.record_volunteer_activity(
  p_user_id uuid,
  p_note    text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  return public.award_points(
    p_user_id,
    'VOLUNTEER_ACTIVITY',
    null,
    coalesce(p_note, 'Volunteer activity')
  );
end;
$$;

revoke all on function public.record_volunteer_activity(uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_volunteer_activity(uuid, text) to service_role;

-- ----------------------------------------------------------------------------
-- 10. Badge catalog: the six specified badges with machine-evaluable criteria
-- ----------------------------------------------------------------------------
update public.badges
   set description = 'Submitted your first civic issue',
       icon        = 'flag',
       criteria    = '{"metric":"reports","count":1}'
 where name = 'First Report';

insert into public.badges (name, description, icon, criteria) values
  ('Civic Watcher',      'Reported 5 civic issues',                     'visibility',   '{"metric":"reports","count":5}'),
  ('Community Helper',   'Reported 10 civic issues to your community',  'groups',       '{"metric":"reports","count":10}'),
  ('Problem Solver',     'Helped bring 3 issues to resolution',         'lightbulb',    '{"metric":"resolved","count":3}'),
  ('Civic Champion',     'Reached the highest civic level',             'emoji_events', '{"metric":"level","count":5}'),
  ('Trusted Citizen',    'Had 3 reports verified by the team',          'verified',     '{"metric":"verified","count":3}')
on conflict (name) do nothing;

-- Remove superseded legacy seed badges that were never earned.
delete from public.badges
 where name in ('Civic Starter', 'Neighborhood Helper', 'Clean Streets Champion',
                'Consistent Citizen', 'Community Watcher', 'Verified Contributor')
   and not exists (
     select 1 from public.user_badges ub where ub.badge_id = badges.id
   );

-- ----------------------------------------------------------------------------
-- 11. Reward notifications: handle penalties gracefully
-- ----------------------------------------------------------------------------
create or replace function public.notify_reward_earned()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_title   text;
  v_message text;
begin
  if new.points >= 0 then
    v_title   := 'Reward Earned';
    v_message := 'You earned ' || new.points || ' point(s)' ||
      case when new.description is not null then ': ' || new.description else '.' end;
  else
    v_title   := 'Points Deducted';
    v_message := abs(new.points) || ' point(s) deducted' ||
      case when new.description is not null then ': ' || new.description else '.' end;
  end if;

  perform public.create_notification(
    new.user_id,
    v_title,
    v_message,
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

-- ----------------------------------------------------------------------------
-- 12. Backfill: recompute levels for existing profiles from level_config
-- ----------------------------------------------------------------------------
-- The profiles_protect_reputation guard (section 4) rejects direct level
-- edits, so open the server-side escape hatch for this maintenance pass and
-- close it again immediately after. Session-level (is_local = false) so it
-- survives statement boundaries when this file is run statement-by-statement
-- (psql); a failing statement aborts the transaction in the SQL Editor, which
-- rolls the setting back automatically.
select set_config('janmitra.allow_reputation_write', 'on', false);

update public.profiles p
   set level = coalesce((
     select lc.level
       from public.level_config lc
      where lc.min_points <= p.points
      order by lc.level desc
      limit 1
   ), 1)
 where p.level is distinct from coalesce((
     select lc.level
       from public.level_config lc
      where lc.min_points <= p.points
      order by lc.level desc
      limit 1
   ), 1);

select set_config('janmitra.allow_reputation_write', '', false);

-- ----------------------------------------------------------------------------
-- Verify:
--   select activity_type, points from reward_rules;
--   select level, title, min_points from level_config order by level;
--   select name, criteria from badges order by name;
--   select proname from pg_proc where proname in
--     ('award_points', 'check_and_award_badges', 'record_volunteer_activity');
-- ----------------------------------------------------------------------------
