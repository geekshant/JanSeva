# JanMitra — Software Requirements Specification (SRS)

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Convention:** Requirement IDs use the prefix `REQ-<domain>-<n>`.

---

## 1. Introduction

This Software Requirements Specification describes the functional and
non-functional requirements of the JanMitra gamified civic engagement platform. It
covers the citizen mobile application (Flutter), the municipal/admin web dashboard
(React), the shared Supabase backend (Postgres, Auth, Storage, Realtime, Edge
Functions), and the parallel Express + Prisma backend (`ADMIN/backend/`).

## 2. Purpose

To provide a complete, testable, and traceable statement of what the system must
do, for developers, QA, municipal stakeholders, and future maintainers.

## 3. Scope

In scope: citizen reporting/tracking, AI-assisted evidence validation,
department/officer assignment, SLA monitoring, community verification, gamification,
safety features, notifications, analytics, automation, and administration.

Out of scope: payments, multi-city multi-tenant rollout, SMS gateway, offline-first
sync.

## 4. Definitions

See `JANMITRA_GLOSSARY.md` for the full glossary. Key terms: Complaint, Evidence,
Category, Severity, SLA, Department, Officer, Verification, Community
Verification, Resolution Evidence, Reputation, Badge, Level, SOS, Trusted Contact,
Safety Check-in, Safe Place, Anonymous Report, AI Decision, AI Review Queue,
Automation Rule, Civic Incident, Ward, Bhopal Geofence.

## 5. Acronyms

| Acronym | Meaning |
|---------|---------|
| RLS | Row Level Security (Postgres) |
| RPC | Remote Procedure Call (PostgREST function) |
| SLA | Service Level Agreement |
| FCM | Firebase Cloud Messaging |
| KYC | Know Your Customer |
| SOS | Save Our Souls (emergency signal) |
| RPC | Remote Procedure Call |
| PostGIS | Postgres geospatial extension |
| pg_trgm | Postgres trigram similarity extension |

## 6. Stakeholders

| Stakeholder | Interest |
|-------------|----------|
| Citizens | Report and track issues; safety; reputation |
| Municipal officers | Receive and resolve assignments |
| Department admins | Manage department workload |
| Municipal admin | Overall governance |
| Police / safety responders | Respond to SOS/safety alerts |
| Product owner | Feature delivery |
| QA | Test coverage |
| Operations | Uptime, monitoring |

## 7. System Overview

Two client surfaces (Flutter mobile, React admin) over a shared Supabase project.
A parallel Express/Prisma backend exists but is not wired to the admin frontend.
See `00_MASTER_PROJECT_DOCUMENT.md` §3 for the architecture diagram and the
two-backends finding.

## 8. User Classes

| Class | Auth role | Surface |
|-------|-----------|---------|
| Citizen | `authenticated` (Supabase) | Mobile |
| Officer | `OFFICER` / `OFFICIAL` (app_metadata.role) | Admin |
| Department Admin | `DEPARTMENT_ADMIN` | Admin |
| Municipal Admin | `SYSTEM_ADMIN` | Admin |
| Police / Safety responder | `OFFICER` (safety page) | Admin |
| System / AI | `service_role` / edge function | Backend |
| Anonymous | `anon` | Mobile (anonymous report) |

## 9. Functional Requirements

Each requirement below is documented with ID, name, actor, preconditions, main
flow, alternative/error flow, business rules, data, security, and acceptance
criteria. Due to volume, requirements are grouped; see `04_FRD.md` for per-module
detail and `05_USER_STORIES.md` / `06_USE_CASES.md` for narrative forms.

### 9.1 Authentication & Identity

| ID | Name | Actor | Summary |
|----|------|-------|---------|
| REQ-AUTH-01 | Email registration | Citizen | Supabase signUp with email+password+name+phone; `handle_new_user` trigger creates profile. |
| REQ-AUTH-02 | Phone-number login | Citizen | `resolve_phone_login` RPC maps 10-digit phone → email; signInWithPassword. |
| REQ-AUTH-03 | Logout | Citizen | signOut + invalidate user-scoped providers. |
| REQ-AUTH-04 | Password reset | Citizen | `resetPasswordForEmail` → deep-link → `/reset-password`. |
| REQ-AUTH-05 | Aadhaar KYC registration | Citizen | `submit_aadhaar_registration` stores SHA-256 digest + masked form; status `verified`. Optional/skippable. |
| REQ-AUTH-06 | One account per email | System | `profiles_email_uniq` unique index. |
| REQ-AUTH-07 | One account per phone | System | `profiles_phone_normalized_uniq` unique index on `normalize_phone(phone)`. |
| REQ-AUTH-08 | Admin login | Admin | Supabase Auth; role from `app_metadata.role`. |
| REQ-AUTH-09 | Reputation protection | System | `protect_reputation_columns` trigger rejects client writes to `points`/`level` unless GUC `janmitra.allow_reputation_write='on'`. |

**Acceptance (REQ-AUTH-05):** Submitting a valid 12-digit Aadhaar + name (≥3 chars)
returns a `verified` record; a second submission with a *different* Aadhaar for the
same user is rejected with `aadhaar_already_registered`; the stored digest is
`sha256(digits)` and the stored number is masked `XXXX XXXX 1234`.

### 9.2 Complaint Management

| ID | Name | Actor | Summary |
|----|------|-------|---------|
| REQ-CMP-01 | Create complaint | Citizen | `create_complaint` RPC with category, title (3–200 chars), description, severity, lat/lng, address, image_urls[], image_paths[], idempotency_key. PostGIS geography. |
| REQ-CMP-02 | Minimum photos | Citizen | At least 3 photos required (plus category AI config min if higher). Max 5. |
| REQ-CMP-03 | Bhopal geofence | Citizen | Location must be within lat 23.10–23.40, lng 77.25–77.55; outside → error + clear. |
| REQ-CMP-04 | Idempotent submission | Citizen | `idempotency_key` (`jm_<uid8>_<ts>_<hash>`) prevents duplicate complaint creation. |
| REQ-CMP-05 | Duplicate/similar detection | Citizen | `find_similar_complaints` (same category, within 250m, ranked by pg_trgm title similarity + distance). |
| REQ-CMP-06 | Join similar complaint | Citizen | `join_similar_complaint` files a new complaint linked to a match. |
| REQ-CMP-07 | Complaint number | System | `generate_complaint_number()` → `JM-YYYY-NNNNNN`. |
| REQ-CMP-08 | Status history | System | `create_initial_status_history` + `record_status_change` triggers. |
| REQ-CMP-09 | Add evidence | Citizen | `add_evidence_to_complaint` appends images (ownership enforced server-side). |
| REQ-CMP-10 | Delete complaint | Citizen | Only pre-verification statuses; deletes storage objects first. |
| REQ-CMP-11 | Track complaint | Citizen/Admin | View detail with timeline, assignment, AI, evidence, resolution evidence, community verification. |
| REQ-CMP-12 | Nearby complaints | Citizen | `nearby_complaints` RPC (PostGIS ST_DWithin, privacy-safe projection). |
| REQ-CMP-13 | Heatmap | Citizen | `nearby_complaints_heatmap` RPC (grid density). |

### 9.3 AI Evidence Validation

| ID | Name | Actor | Summary |
|----|------|-------|---------|
| REQ-AI-01 | AI edge function trigger | System | Mobile fires `ai-evidence-verification` edge function after complaint creation (fire-and-forget). |
| REQ-AI-02 | AI result storage | System | Stored in `complaint_ai_verification` (specified, not confirmed in repo SQL). |
| REQ-AI-03 | AI review queue | Admin | `get_complaints_for_ai_review` RPC lists flagged complaints. |
| REQ-AI-04 | Human override | Officer/Admin | `officer_review_complaint` RPC: verify/reject/request-evidence with structured reason types. |
| REQ-AI-05 | AI failure ≠ rejection | System | AI failure must route to human review, never silently reject. |
| REQ-AI-06 | Async retry | System | `retry_stuck_ai_jobs()` via pg_cron + pg_net re-invokes edge function. |
| REQ-AI-07 | Per-category AI config | Admin | `category_ai_config`: requires_images, min/max images, review_threshold, category_hints. |

### 9.4 Department & Officer Management

| ID | Name | Actor | Summary |
|----|------|-------|---------|
| REQ-DEP-01 | Department CRUD | Admin | `departments` table (specified, not in repo SQL). |
| REQ-DEP-02 | Category-department mapping | Admin | `categoryMapping`/mapping table. |
| REQ-DEP-03 | Officer CRUD | Admin | `officers` table joined to `profiles`. |
| REQ-DEP-04 | Manual assignment | Officer/Admin | `manual_assign_complaint` RPC. |
| REQ-DEP-05 | Auto-assignment | System | Specified in prompt; manual assignment is implemented; full auto-assignment logic (jurisdiction, distance, workload) is **specified but not confirmed implemented**. |

### 9.5 SLA Management

| ID | Name | Actor | Summary |
|----|------|-------|---------|
| REQ-SLA-01 | SLA deadline | System | `complaints.sla_deadline` column exists; population logic specified but not confirmed in repo SQL. |
| REQ-SLA-02 | SLA rules | Admin | `sla_rules` table (per category/department/severity: deadline_hours, warning_hours, critical_hours). |
| REQ-SLA-03 | SLA overview | Admin | On-track/due-soon/at-risk/breached/escalated/resolved counts. |
| REQ-SLA-04 | SLA breach alert | Admin | Toast on breach/escalation count increase. |
| REQ-SLA-05 | SLA warning notification | System | `SLA_WARNING` notification type defined in Express backend but **never sent** (no background monitor). **Missing.** |

### 9.6 Gamification

| ID | Name | Actor | Summary |
|----|------|-------|---------|
| REQ-GAM-01 | Award points | System | `award_points` (service_role only) reads `reward_rules`; idempotent per (complaint, activity). |
| REQ-GAM-02 | Points: valid report +50, verified +100, volunteer +75, resolved +25, duplicate/fake −50 | System | `reward_rules` seeded values. |
| REQ-GAM-03 | Levels | System | `level_config` (1 Civic Starter 0, …, 5 Civic Champion 1000). |
| REQ-GAM-04 | Badges | System | `check_and_award_badges` evaluates JSON criteria. |
| REQ-GAM-05 | Leaderboard | Citizen | `community_leaderboard` RPC; privacy-safe; respects `privacy_show_leaderboard`. |
| REQ-GAM-06 | Reputation summary | Citizen | `get_reputation_summary` RPC. |
| REQ-GAM-07 | No client point writes | System | Trigger + RLS enforce. |

### 9.7 Notifications

| ID | Name | Actor | Summary |
|----|------|-------|---------|
| REQ-NOT-01 | In-app notifications | Citizen | `notifications` table; trigger-only writes via `create_notification` (revoked from clients). |
| REQ-NOT-02 | Push delivery | System | `send-push-notifications` edge function drains outbox; FCM v1. |
| REQ-NOT-03 | Notification triggers | System | Complaint submitted, status change (verified/assigned/in-progress/resolved), reward earned/deducted, badge earned. |
| REQ-NOT-04 | Mark read | Citizen | Optimistic update; `is_read`/`read_at`. |
| REQ-NOT-05 | Device token registration | Citizen | `device_tokens` upsert; respects `notify_push` preference. |
| REQ-NOT-06 | Per-category preferences | Citizen | `notification_preferences` table + `upsert_notification_preference` RPC. |

### 9.8 Safety

| ID | Name | Actor | Summary |
|----|------|-------|---------|
| REQ-SAF-01 | SOS | Citizen | `trigger_sos` RPC (lat/lng/address/message) → `safety_incidents`; live location sharing every 15s via `share_location`; cancel via `cancel_sos`. |
| REQ-SAF-02 | Trusted contacts | Citizen | Max 3; CRUD via RPCs. |
| REQ-SAF-03 | Safety check-in | Citizen | `create_safety_checkin` (interval) → `complete_safety_checkin`; auto-SOS on miss. |
| REQ-SAF-04 | Nearby safe places | Citizen | `find_nearby_safety_places` RPC (police/hospital/safe place). |
| REQ-SAF-05 | Anonymous report | Citizen | `submit_anonymous_report` RPC. |
| REQ-SAF-06 | Safety alert management | Admin | `get_active_safety_alerts`; acknowledge/resolve; buzzer. |
| REQ-SAF-07 | Police assignment | System | Specified; acknowledge/resolve implemented in admin. Full closest-officer/station selection logic **specified but not confirmed implemented**. |

### 9.9 Community Verification

| ID | Name | Actor | Summary |
|----|------|-------|---------|
| REQ-CV-01 | Verifiable complaints list | Citizen | `verifiable_complaints` RPC (RESOLVED + pending, within radius, before/after images). |
| REQ-CV-02 | Submit verification | Citizen | `submit_community_verification` (boolean + comment + photos); one per citizen. |
| REQ-CV-03 | Reopen on dispute | System/Admin | `verification_status` ∈ pending/confirmed/reopened/needs_review. |

### 9.10 Analytics

| ID | Name | Actor | Summary |
|----|------|-------|---------|
| REQ-ANL-01 | Dashboard KPIs | Admin | `get_dashboard_complaints` + `get_analytics_summary`. |
| REQ-ANL-02 | Trends | Admin | Submitted vs resolved over time. |
| REQ-ANL-03 | Category/status/severity distribution | Admin | Client-side + RPC. |
| REQ-ANL-04 | Department performance | Admin | `get_department_analytics`. |
| REQ-ANL-05 | Ward analytics | Admin | `get_ward_analytics`. |
| REQ-ANL-06 | Hot zones | Admin | `get_hot_zones` (PostGIS). |
| REQ-ANL-07 | AI analytics | Admin | `get_ai_analytics`. |
| REQ-ANL-08 | Civic health | Admin | Resolution rate × 0.6 + engagement rate × 0.4. |

### 9.11 Automation

| ID | Name | Actor | Summary |
|----|------|-------|---------|
| REQ-AUT-01 | Automation center | Admin | Engine status, stats, execution log, failed retries. |
| REQ-AUT-02 | Automation rules | Admin | Enable/disable, edit. |
| REQ-AUT-03 | Audit log | Admin | `automation_audit_log`. |

### 9.12 Map & Geolocation

| ID | Name | Actor | Summary |
|----|------|-------|---------|
| REQ-MAP-01 | GPS capture | Citizen | Geolocator high accuracy; permission request. |
| REQ-MAP-02 | Manual location | Citizen | Tap/drag marker on flutter_map (Mapbox tiles). |
| REQ-MAP-03 | Reverse geocoding | Citizen | `geocoding` package (non-blocking). |
| REQ-MAP-04 | Civic map (admin) | Admin | Mapbox GL JS; viewport-bounded `get_map_complaints`. |
| REQ-MAP-05 | Markers/heatmap/clustering | Both | Implemented. |

### 9.13 Profile, Privacy, Accessibility

| ID | Name | Actor | Summary |
|----|------|-------|---------|
| REQ-PRO-01 | Edit profile | Citizen | Whitelisted fields only (name/phone/avatar/city/ward). |
| REQ-PRO-02 | Avatar upload | Citizen | `avatars` public bucket. |
| REQ-PRO-03 | Preferences | Citizen | notify_push/email/in_app, privacy_show_leaderboard/ward. |
| REQ-PRO-04 | Privacy settings | Citizen | Profile visibility, location precision, Aadhaar masking, data download, account deletion (30-day), logout-all, clear location history. |
| REQ-PRO-05 | Accessibility | Citizen | Font scale, high contrast, reduce motion, screen reader hints, larger touch targets. |
| REQ-PRO-06 | i18n | Citizen | English + Hindi. |

### 9.14 Admin Dashboard

See `22_ADMIN_DASHBOARD_SPEC.md` for page-by-page detail. Every admin page is
covered by REQs in §9.1–9.13 and the admin spec.

## 10. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-PERF-01 | Performance | Nearby complaints query returns within 2s for ≤100 results. |
| NFR-PERF-02 | Performance | Dashboard complaints load within 3s for ≤500 rows. |
| NFR-SCAL-01 | Scalability | Supabase pooler + RLS; designed for a single city (Bhopal). |
| NFR-AVAIL-01 | Availability | Depends on Supabase SLA; no app-level HA. |
| NFR-SEC-01 | Security | RLS on every table; SECURITY DEFINER for privileged writes; service-role only in edge functions. |
| NFR-SEC-02 | Security | Reputation columns protected by trigger. |
| NFR-SEC-03 | Security | No client can write points/levels/notifications. |
| NFR-PRIV-01 | Privacy | Nearby queries return privacy-safe projections (no user_id, truncated description). |
| NFR-PRIV-02 | Privacy | Leaderboard excludes users with `privacy_show_leaderboard=false`. |
| NFR-PRIV-03 | Privacy | Aadhaar stored as SHA-256 digest + masked only. |
| NFR-PRIV-04 | Privacy | SOS location data not unnecessarily exposed. |
| NFR-AUDIT-01 | Audit | Status history trigger; `officer_review_complaint` writes `audit_logs` (specified). |
| NFR-USE-01 | Usability | Report in < 1 minute (5-step wizard). |
| NFR-I18N-01 | i18n | English + Hindi. |
| NFR-ACC-01 | Accessibility | Font scale, high contrast, reduce motion, screen reader hints, larger touch targets. |
| NFR-MAINT-01 | Maintainability | Idempotent SQL migrations; layered frontend (service + hook + page). |

## 11. System Constraints
- Supabase hosted project (Postgres 15+ with PostGIS, pg_trgm, pgcrypto, pg_net, pg_cron).
- Mapbox for map tiles (not Google Maps).
- Firebase for FCM push.
- Bhopal geofence for complaint location.
- Flutter 3.x / Dart 3.13+ for mobile.
- React 18 / Vite 5 / TS 5.6 for admin.

## 12. Assumptions
- The live Supabase project has the extended schema (officers, departments, AI tables, safety tables, automation tables, extended enum) applied directly, even though not version-controlled in the repo.
- Email verification is disabled (per database README) — signup signs in directly.
- The Express backend is not used by the admin frontend (it uses Supabase directly).

## 13. Dependencies
- Supabase (Auth, DB, Storage, Realtime, Edge Functions).
- Mapbox (map tiles).
- Firebase (FCM).
- pg_trgm, PostGIS, pgcrypto, pg_net, pg_cron (Postgres extensions).

## 14. External Interfaces
- Supabase Auth (email/password, phone resolution).
- Supabase PostgREST (RPCs).
- Supabase Realtime (postgres_changes).
- Supabase Storage (complaint_images, avatars).
- Mapbox tiles API.
- Firebase Cloud Messaging.
- AI edge function `ai-evidence-verification` (external, not in repo).
- Edge function `download-my-data` (external, not in repo).
- Cloudinary (Express backend only — parallel stack).

## 15. Database Requirements
See `17_DATABASE_DESIGN.md` and `18_DATA_DICTIONARY.md`.

## 16. Security Requirements
See `20_SECURITY_SPEC.md`.

## 17–22. Availability / Performance / Scalability / Privacy / Audit / Acceptance
See NFRs in §10 and `21_RBAC_MATRIX.md`, `36_PRIVACY_DATA_PROTECTION.md`,
`27_AUDIT_LOG_SPEC.md`. Acceptance criteria are embedded in each REQ above and
elaborated in `05_USER_STORIES.md`.
