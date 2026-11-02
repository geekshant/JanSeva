# JanMitra Database Setup

This directory contains the SQL to set up the JanMitra database on your own
Supabase project.

## Quick Setup (Recommended)

1. Open your Supabase project dashboard: **SQL Editor > New query**
2. Open `janmitra_full_setup.sql` from this folder
3. Copy the entire contents and paste into the SQL Editor
4. Click **Run**

That's it. The script cleans up any previous partial run, then creates
everything: schema & functions (01–06), civic reputation (07), reputation +
nearby-map RPCs (08), profile avatars (09), community verification (10),
duplicate detection + community leaderboard (11), phone-number login (12), the
Aadhaar registration gate (13) and one-account-per-e-mail (15).

**Prefer running the files individually?** On a fresh project run them in
order: `01` → `02` → `03` → `04` → `05` → `06` → `07` → `08` → `09` → `10`
→ `11` → `12` → `13` → `15`. Every file is idempotent — safe to re-run any
time.

## Updating an existing project

`janmitra_full_setup.sql` **drops every table before recreating it** — never
run it against a project that already holds data. Add a newer feature to an
existing project by running only that feature's incremental file: each one is
additive and idempotent.

In the Supabase **SQL Editor**, run one query per file:

```
database/12_phone_login.sql   -- mobile-number sign-in
database/13_aadhaar_kyc.sql   -- Aadhaar registration gate
database/15_unique_contacts.sql -- one account per e-mail address
```

### Aadhaar registration fails with "Something went wrong"

The `aadhaar_kyc` table and the `submit_aadhaar_registration()` RPC are created
by `13_aadhaar_kyc.sql`. On a project where that file has never been applied,
PostgREST answers:

```
PGRST202: Could not find the function
public.submit_aadhaar_registration(p_aadhaar, p_full_name) in the schema cache
```

The app maps that to `auth.error.backendOutOfDate` ("The server is missing
required features"). Apply `13_aadhaar_kyc.sql` — and `12_phone_login.sql`, so
that signing in with a mobile number resolves — then submit again. The same
check applies to any `PGRST202` / `PGRST205` ("could not find the
function/table") response.

## Sign-in flow

1. **Sign in / register** with e-mail **or** mobile number + password
   (`12_phone_login.sql`). Supabase Auth authenticates by e-mail, so a mobile
   number is resolved to the account's e-mail by the `resolve_phone_login`
   RPC before `signInWithPassword` is called. Signup stores the mobile number
   on `profiles.phone` (10 digits, one account per number).
   **Email verification is switched off** — Authentication > Providers >
   Email > **Confirm email** unticked — so signup signs the citizen straight
   in; neither the mobile app nor the admin dashboard shows a "check your
   e-mail" step. One account per address (`15_unique_contacts.sql`) and one
   per mobile number (`12_phone_login.sql`).
2. **Aadhaar registration** (`13_aadhaar_kyc.sql`) — the app holds the citizen
   on its registration screen until `submit_aadhaar_registration()` succeeds.
   Only a SHA-256 digest and the masked `XXXX XXXX 9012` form are stored; the
   row is created as `verified`.
3. Only then does the router release the citizen into Home, reporting,
   verification, rewards and the rest of the app.

## Create a Demo User

The app's demo mode auto-signs-in with these credentials:

- **Email:** `aarav@janmitra.example`
- **Password:** `JanMitra123`

To create this user in your project:

1. Dashboard > **Authentication > Users > Add user**
2. Enter `aarav@janmitra.example` and `JanMitra123`
3. Check "Auto Confirm User" (so email confirmation isn't required)
4. Click **Create user**

The `handle_new_user` trigger automatically creates a `profiles` row when
the auth user is created, so no manual profile insert is needed.

To also sign in with a **mobile number**, give that profile a phone number
(10 digits, stored canonically):

```sql
update public.profiles
   set phone = '9876543210'
 where email = 'aarav@janmitra.example';
```

Sign in with either `aarav@janmitra.example` or `9876543210` plus the same
password.

## Update the App's `.env`

Edit `mobile/.env` with your project's credentials:

```
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
MAPBOX_ACCESS_TOKEN=your_mapbox_token
APP_ENV=development
```

Find these in: Dashboard > **Project Settings > API**
- **URL** = `SUPABASE_URL`
- **anon public** key (or `sb_publishable_...` key) = `SUPABASE_ANON_KEY`

## Files

| File | Description |
|------|-------------|
| `janmitra_full_setup.sql` | All-in-one script (easiest — paste & run) |
| `01_schema.sql` | Tables, enums, constraints |
| `02_functions_triggers.sql` | RPC functions and database triggers |
| `03_rls_policies.sql` | Row Level Security policies |
| `04_storage.sql` | Storage bucket and policies |
| `05_seed_data.sql` | Categories and badges seed data |
| `06_notifications.sql` | Notifications, device tokens, notification triggers |
| `07_reputation.sql` | Civic reputation engine: `reward_rules`, `level_config`, `award_points()`, badge criteria, points/level guard trigger |
| `08_reputation_api.sql` | `get_reputation_summary()` + `community_complaint_stats()` + `nearby_complaints()` RPCs, legacy trigger cleanup, profiles insert guard |
| `09_avatars_storage.sql` | `avatars` storage bucket + owner-scoped policies (profile photos) |
| `10_community_verification.sql` | `verifiable_complaints()` picks + `submit_community_verification()` + `community_verifications`/`resolution_evidence` tables |
| `11_similarity_and_leaderboard.sql` | `find_similar_complaints()` / `join_similar_complaint()` (duplicate detection, pg_trgm + PostGIS), `add_evidence_to_complaint()`, `community_leaderboard()` |
| `12_phone_login.sql` | `normalize_phone()`, unique mobile-number index, `resolve_phone_login()` (mobile → e-mail for sign-in), `handle_new_user()` now stores `profiles.phone` |
| `13_aadhaar_kyc.sql` | `aadhaar_kyc` table + `submit_aadhaar_registration()` (validates, hashes and verifies the Aadhaar number) — the gate the app applies after sign-in |
| `15_unique_contacts.sql` | `profiles_email_uniq` unique index — one account per e-mail address (mobile numbers are covered by `12_phone_login.sql`) |

> **Already ran an earlier version?** Run `06_notifications.sql`,
> `07_reputation.sql`, `08_reputation_api.sql`, `10_community_verification.sql`,
> `11_similarity_and_leaderboard.sql`, then `12_phone_login.sql`,
> `13_aadhaar_kyc.sql` and `15_unique_contacts.sql` in order to add the
> notification triggers, `device_tokens` table, civic reputation system,
> community verification, duplicate detection, mobile-number login, the
> Aadhaar registration table and the one-account-per-e-mail index. All are
> idempotent and preserve your data. (Re-running `janmitra_full_setup.sql`
> also works, but it **drops and recreates every table** — existing data is
> lost.)

## Schema Overview

```
profiles  ──┐
            ├──< complaints >── categories
            │        ├──< complaint_images
            │        ├──< complaint_status_history
            │        └──< rewards
            ├──< user_badges >── badges
            └──< notifications
```

- **profiles**: Citizen accounts (auto-created from auth.users via trigger);
  `points`/`level` are server-managed only (clients cannot write them)
- **categories**: Civic issue types (10 seeded)
- **complaints**: Filed reports with PostGIS geography location
- **complaint_images**: Photos uploaded to Supabase Storage
- **complaint_status_history**: Audit trail of status changes
- **rewards**: Point transactions awarded by `award_points()` (rules-driven)
- **reward_rules**: Configurable point values per activity (valid report +50,
  verified +100, volunteer +75, resolved +25, duplicate/fake −50)
- **level_config**: Configurable level thresholds (Level 1 Civic Starter …
  Level 5 Civic Champion)
- **badges**: Achievement definitions with JSON `criteria` evaluated
  server-side (First Report, Civic Watcher, Community Helper, Problem Solver,
  Civic Champion, Trusted Citizen)
- **user_badges**: Badges earned by users (written only by server functions)
- **notifications**: In-app notifications (complaint lifecycle, rewards, badges)
- **device_tokens**: FCM registration tokens per device (for push delivery)
- **aadhaar_kyc**: One row per citizen created by the app's mandatory
  post-sign-in Aadhaar registration; holds only `sha256(aadhaar)` and the
  masked number, plus `status` (`pending`/`verified`/`rejected`). Written
  exclusively by the `submit_aadhaar_registration()` RPC.

Points are **only** awarded by database triggers/functions reading
`reward_rules` — never by the mobile client. The app reads everything through
RLS-scoped selects and the `get_reputation_summary()` RPC.

## Verify the Setup

After running the SQL, verify in the SQL Editor:

```sql
-- Check categories
select name, icon from categories order by name;

-- Check badges
select name, icon, criteria from badges order by name;

-- Check reputation config
select activity_type, points from reward_rules;
select level, title, min_points from level_config order by level;

-- Check reputation summary (run while authenticated as a user)
select public.get_reputation_summary();

-- Check storage bucket
select id, name, public from storage.buckets where id = 'complaint_images';
select id, name, public from storage.buckets where id = 'avatars';

-- Check functions
select proname from pg_proc where pronamespace = 'public'::regnamespace;
```
