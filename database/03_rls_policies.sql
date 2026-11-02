-- ============================================================================
-- JanMitra Database Setup - Step 3: Row Level Security (RLS) Policies
-- ============================================================================
-- Run after 02_functions_triggers.sql.
-- ============================================================================

-- Enable RLS on all tables
alter table public.profiles                  enable row level security;
alter table public.categories                enable row level security;
alter table public.complaints                enable row level security;
alter table public.complaint_images           enable row level security;
alter table public.complaint_status_history   enable row level security;
alter table public.rewards                    enable row level security;
alter table public.badges                     enable row level security;
alter table public.user_badges               enable row level security;
alter table public.notifications              enable row level security;
alter table public.device_tokens              enable row level security;

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth_user_id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth_user_id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- CATEGORIES (publicly readable when active)
-- ----------------------------------------------------------------------------
drop policy if exists "Active categories are publicly readable" on public.categories;
create policy "Active categories are publicly readable"
  on public.categories for select
  using (active = true);

-- ----------------------------------------------------------------------------
-- COMPLAINTS
-- Citizens may only SELECT their OWN complaints. Community-wide aggregate
-- stats (counts) are served by the `community_complaint_stats` SECURITY
-- DEFINER RPC, and the nearby map view by the `nearby_complaints` RPC —
-- both privacy-safe, so no broad SELECT policy is needed here.
-- ----------------------------------------------------------------------------
drop policy if exists "Citizens can view their own complaints" on public.complaints;
create policy "Citizens can view their own complaints"
  on public.complaints for select
  to authenticated
  using (user_id = public.current_profile_id());

-- NOTE: deliberately NO "view all complaints" policy. The previous
-- `using (true)` SELECT policy leaked every complaint's address, location
-- and description to any authenticated user and has been removed.

drop policy if exists "Citizens can create complaints for themselves" on public.complaints;
create policy "Citizens can create complaints for themselves"
  on public.complaints for insert
  to authenticated
  with check (user_id = public.current_profile_id());

-- ----------------------------------------------------------------------------
-- COMPLAINT IMAGES
-- Only the owner of a complaint may view/add its images.
-- ----------------------------------------------------------------------------
drop policy if exists "Citizens can view images of their own complaints" on public.complaint_images;
create policy "Citizens can view images of their own complaints"
  on public.complaint_images for select
  to authenticated
  using (public.is_own_complaint(complaint_id));

drop policy if exists "Citizens can add images to their own complaints" on public.complaint_images;
create policy "Citizens can add images to their own complaints"
  on public.complaint_images for insert
  to authenticated
  with check (public.is_own_complaint(complaint_id));

-- ----------------------------------------------------------------------------
-- COMPLAINT STATUS HISTORY
-- ----------------------------------------------------------------------------
drop policy if exists "Citizens can view their own complaint history" on public.complaint_status_history;
create policy "Citizens can view their own complaint history"
  on public.complaint_status_history for select
  using (public.is_own_complaint(complaint_id));

-- ----------------------------------------------------------------------------
-- REWARDS
-- ----------------------------------------------------------------------------
drop policy if exists "Citizens can view their own rewards" on public.rewards;
create policy "Citizens can view their own rewards"
  on public.rewards for select
  using (user_id = public.current_profile_id());

-- ----------------------------------------------------------------------------
-- BADGES (publicly readable)
-- ----------------------------------------------------------------------------
drop policy if exists "Badges are publicly readable" on public.badges;
create policy "Badges are publicly readable"
  on public.badges for select
  using (true);

-- ----------------------------------------------------------------------------
-- USER BADGES
-- ----------------------------------------------------------------------------
drop policy if exists "Citizens can view their own badges" on public.user_badges;
create policy "Citizens can view their own badges"
  on public.user_badges for select
  using (user_id = public.current_profile_id());

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
drop policy if exists "Citizens can view their own notifications" on public.notifications;
create policy "Citizens can view their own notifications"
  on public.notifications for select
  using (user_id = public.current_profile_id());

drop policy if exists "Citizens can mark their own notifications as read" on public.notifications;
create policy "Citizens can mark their own notifications as read"
  on public.notifications for update
  using (user_id = public.current_profile_id())
  with check (user_id = public.current_profile_id());

-- NOTE: there is deliberately NO INSERT policy on notifications. Rows are
-- written only by SECURITY DEFINER triggers/functions (complaint lifecycle,
-- rewards, badges), so clients cannot spoof notifications for themselves or
-- others. FCM push delivery is handled server-side (push_sent outbox flag).

-- ----------------------------------------------------------------------------
-- DEVICE TOKENS (FCM registration tokens)
-- ----------------------------------------------------------------------------
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
