# JanMitra — Master Project Document

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Status:** Living document — based on inspection of the actual repository at `D:\Janmitra\JanMitra`.

---

## 0. How to Read This Document

This document is the single entry point for the JanMitra project. Throughout the
documentation package, three labels are used consistently to avoid fabricating
implementation details:

| Label | Meaning |
|-------|---------|
| **Implemented** | Source code, database migration, or configuration in the repository provides direct evidence that the feature exists and works. |
| **Specified but not confirmed implemented** | A document, migration comment, UI label, or code reference suggests the feature, but no confirming source artifact (table, function, working screen, endpoint) was found in the repo. May exist only on the live hosted project. |
| **Missing** | No evidence found anywhere; or the feature is explicitly broken/incomplete in the source. |

A critical architectural reality is documented up front in §3 so that every
downstream document is read in the correct light.

---

## 1. Project Overview

**JanMitra** is a **gamified civic engagement platform** that enables citizens to
report hyper-local civic problems (potholes, garbage, broken streetlights, water
leakage, unauthorized construction, stray animals, public safety hazards, etc.)
using photographs and location, track complaints transparently through a
municipal workflow, receive status notifications, participate in community
verification of resolutions, earn civic reputation (points, badges, levels), and
use women-safety features (SOS, trusted contacts, safety check-in, nearby safe
places, anonymous reporting).

The platform has two primary surfaces:

- **A. JanMitra Citizen Mobile Application** — a Flutter app for Android/iOS.
- **B. JanMitra Municipal/Admin Web Dashboard** — a React + TypeScript single-page
  application for municipal staff.

Both surfaces are backed by a shared **Supabase** project (Postgres + Auth + Storage
+ Realtime + Edge Functions).

---

## 2. Vision, Mission, Problem Statement

### 2.1 Vision
A city where every citizen is an active participant in keeping their neighbourhood
clean, safe, and well-maintained — and where the municipality responds
transparently and accountably.

### 2.2 Mission
Make civic complaint reporting effortless (photo + location + a few taps), make
municipal response transparent (real-time status, SLA tracking, officer
assignment), and make civic participation rewarding (gamified reputation).

### 2.3 Problem Statement (existing problem)
- Citizens have no easy channel to report hyper-local civic issues; complaints
  disappear into paper registers or phone calls with no tracking.
- Municipalities lack verified, photo-evidenced, geo-located, categorized
  complaints with which to prioritize work.
- There is no transparency: citizens never learn the status, the responsible
  department/officer, or whether an issue was truly resolved.
- There is no community accountability or incentive for civic participation.

### 2.4 Proposed Solution
A single platform that:
1. Lets a citizen capture a photo, pick a category, set a location, and file a
   complaint in under a minute.
2. Optionally validates evidence with an AI image/category consistency check
   (human-in-the-loop, never fully automated).
3. Routes the complaint through a verification → assignment → in-progress →
   resolution → community-verification → closure lifecycle.
4. Tracks SLA deadlines and surfaces breaches to administrators.
5. Notifies the citizen at every status transition.
6. Awards civic reputation points and badges for valid reports, verified
   reports, volunteer activity, and resolved issues; penalizes duplicate/fake
   reports.
7. Provides women-safety tooling (SOS with live location sharing, trusted
   contacts, safety check-in, nearby safe places, anonymous reporting).
8. Gives administrators an analytics dashboard, civic map, department/officer
   management, AI review queue, SLA management, automation center, and audit
   trail.

---

## 3. End-to-End System Overview (and a Critical Architectural Note)

```mermaid
flowchart LR
    subgraph Clients
        M[Mobile App<br/>Flutter]
        A[Admin Dashboard<br/>React/Vite/TS]
    end
    subgraph SupabaseProject["Supabase Project (Postgres)"]
        PUB["public schema<br/>mobile + shared tables<br/>RLS + RPCs + triggers"]
        ADM["admin schema<br/>Express/Prisma backend<br/>parallel data model"]
    end
    EF["Edge Function<br/>send-push-notifications"]
    FCM[Firebase Cloud Messaging]
    MBX[Mapbox tiles]

    M -->|supabase_flutter<br/>RPC + Realtime + Storage| PUB
    A -->|@supabase/supabase-js<br/>RPC + Realtime| PUB
    EF -->|service_role<br/>drains outbox| PUB
    EF --> FCM
    M --> MBX
    A --> MBX
    PUB -.->|raw SQL only<br/>schema mismatch| ADM
```

### 3.1 The Two Backends

The repository contains **two distinct backend approaches**, which is the single
most important architectural fact to understand:

1. **Supabase-direct (public schema)** — Used by **both** the mobile app and the
   admin frontend. Clients call PostgREST RPC functions, read/write tables
   through RLS-scoped queries, subscribe to Realtime, and use Supabase Storage.
   This is the **primary, live** backend.

2. **Express + Prisma backend (`ADMIN/backend/`)** — A standalone Node/Express API
   with its own Prisma schema in a **separate `admin` schema** in the same Supabase
   Postgres project. It has its own `User`, `Complaint`, `Department`,
   `ComplaintAssignment`, `AuditLog`, `PointsTransaction`, `Badge`, etc. tables.
   It provides 57 REST endpoints, JWT auth, Socket.IO realtime, Cloudinary image
   uploads, and FCM push.

> **Finding:** The admin frontend (React) **does not call the Express backend.**
> It uses `@supabase/supabase-js` directly with the anon key and calls `public`
> schema RPCs (`get_dashboard_complaints`, `manual_assign_complaint`,
> `officer_review_complaint`, etc.). The Express backend therefore appears to be a
> **parallel/alternate implementation** that is not wired into the current admin
> frontend. Both are documented in this package, but the **Supabase-direct path is
> the one in active use**. See `JANMITRA_GAP_ANALYSIS.md` and
> `JANMITRA_ADR.md` for the implications.

### 3.2 The Version-Controlled vs. Live Schema Gap

The repository's `database/` directory contains version-controlled SQL for the
`public` schema. However, migrations `12`–`14` (and the mobile/admin apps)
**reference many tables that are never `CREATE`d in any committed SQL file**:

- `complaint_ai_verification`, `officers`, `audit_logs`, `system_config`,
  `departments`, `civic_incidents`, `duplicate_links`, `complaint_assignments`,
  `category_ai_config`, `sla_rules`, `safety_alerts`, `safety_incidents`,
  `safety_contacts`, `safety_checkins`, `safe_places`, `anonymous_reports`,
  `automation_rules`, `automation_executions`, `automation_audit_log`,
  `user_settings`, `notification_preferences`, `wards`, `assignment_audit_logs`.

The `10_community_verification.sql` header explicitly states these objects *"were
applied to the live project directly"* — i.e. a schema layer exists on the hosted
Supabase project that is **not version-controlled in this repository**.
Throughout this documentation, these are labeled **"Specified but not confirmed
implemented (in repo)"** — they almost certainly exist on the live project, but
their exact definitions cannot be verified from the repo alone.

Similarly, the `complaint_status` enum is defined in `01_schema.sql` with only 6
values (`SUBMITTED, VERIFIED, ASSIGNED, IN_PROGRESS, RESOLVED, REJECTED`), yet the
mobile app and admin frontend use ~19–20 values (including `AI_CHECKING`,
`AI_VERIFIED`, `AI_REVIEW_REQUIRED`, `AI_FAILED`, `EVIDENCE_REQUIRED`, `CLOSED`,
`REOPENED`, `AUTO_VALIDATING`, `NEEDS_REVIEW`, `COMMUNITY_VERIFICATION`, etc.).
The live enum has clearly been extended via `ALTER TYPE ADD VALUE` outside the
repo.

---

## 4. Objectives

1. Enable citizens to report civic issues with photo + location + category in
   under one minute.
2. Provide an AI-assisted (human-in-the-loop) evidence validation layer.
3. Provide a transparent, auditable complaint lifecycle with SLA monitoring.
4. Route complaints to the correct department and officer.
5. Allow community verification of resolutions.
6. Gamify civic participation with server-controlled points/badges/levels.
7. Provide women-safety tooling with live location sharing and responder
   notification.
8. Give administrators real-time analytics, a civic map, and an automation
   center.

---

## 5. Scope

### 5.1 In Scope
- Citizen mobile app (Flutter): reporting, tracking, map, gamification,
  notifications, safety, profile, privacy.
- Admin web dashboard (React): complaints management, AI review queue, civic
  map, incidents, SLA, departments, officers, citizens, gamification config,
  analytics, automation center, safety alerts, settings.
- Shared Supabase backend: Postgres schema, RPCs, triggers, RLS, storage,
  realtime, edge functions.
- Edge function for FCM push delivery.

### 5.2 Out of Scope (as of this version)
- Payment / e-commerce integration.
- Multi-tenant multi-city rollout (currently scoped to Bhopal).
- Native AI model training pipeline hosted in-repo (AI is via an external edge
  function not version-controlled here).
- SMS gateway integration (notifications are push + in-app only).
- Offline-first mobile sync (the app degrades gracefully but is not
  offline-capable).

---

## 6. Target Users & Stakeholders

| User class | Description | Surface |
|------------|-------------|---------|
| **Citizen** | Registers with email or phone + Aadhaar KYC; files and tracks complaints; gamification; safety. | Mobile |
| **Officer** | Municipal field officer; receives assignments; updates status; uploads resolution evidence. | Admin (role: OFFICER/OFFICIAL) |
| **Department Admin** | Manages a department's complaints and officers. | Admin (role: DEPARTMENT_ADMIN) |
| **Municipal Admin** | Full system administration. | Admin (role: SYSTEM_ADMIN) |
| **Police / Safety Responder** | Acknowledges/resolves safety alerts. | Admin (safety alerts page) |
| **System / AI** | Automated agents (AI edge function, pg_cron retry job). | Backend |

---

## 7. Major Modules — Feature Inventory

### 7.1 Citizen Mobile App (Implemented unless noted)

| Module | Status | Notes |
|--------|--------|------|
| Splash + Onboarding | Implemented | 3-page intro; persists seen flag. |
| Registration (email + phone) | Implemented | Supabase Auth; `handle_new_user` trigger creates profile; phone uniqueness via `resolve_phone_login`. |
| Login (email or phone) | Implemented | `resolve_phone_login` RPC maps phone → email. |
| Password reset (deep link) | Implemented | `passwordRecovery` event → `/reset-password`. |
| Aadhaar KYC registration gate | Implemented | `submit_aadhaar_registration` RPC; stores SHA-256 digest + masked form. Optional (skippable). |
| Home dashboard | Implemented | Reputation card, community snapshot, recent complaints, nearby preview, evidence-required alert, verify-resolutions card. |
| Report issue (5-step wizard) | Implemented | Category → Photos (min 3) → Location (Bhopal geofence) → Details → Review; duplicate detection via `find_similar_complaints`; join-similar via `join_similar_complaint`. |
| Complaint success screen | Implemented | Shows actual awarded points from `rewards` table. |
| My complaints | Implemented | Search, filter (All/Active/Resolved/Reopened), sort, realtime. |
| Complaint detail | Implemented | Timeline, assignment, AI status banner, incident card, evidence gallery (rounds), resolution evidence, delete (pre-verification only), add evidence. |
| Nearby / Map | Implemented | flutter_map + Mapbox tiles; markers, heatmap, clustering, radius 500m–10km, filters, realtime refresh. |
| Community verification | Implemented | `verifiable_complaints` + `submit_community_verification` RPCs; mandatory verification photos. |
| Gamification — rewards | Implemented | `get_reputation_summary` RPC; points/level/progress; badges grid; reward rules; contribution history. |
| Gamification — leaderboard | Implemented | `community_leaderboard` RPC; privacy-safe (no user ids). |
| Safety — SOS | Implemented | `trigger_sos` / `cancel_sos` / `share_location` (every 15s) RPCs. DB-backed. |
| Safety — trusted contacts | Implemented | Max 3; CRUD via RPCs. |
| Safety — check-in | Implemented | `create_safety_checkin` / `complete_safety_checkin`; auto-SOS on miss. |
| Safety — nearby safe places | Implemented | `find_nearby_safety_places` RPC (police/hospital/safe place). |
| Safety — anonymous report | Implemented | `submit_anonymous_report` RPC. |
| Notifications — in-app | Implemented | `notifications` table; optimistic mark-read; realtime. |
| Notifications — push (FCM) | Implemented | `device_tokens` upsert; `send-push-notifications` edge function drains outbox. |
| Profile | Implemented | Edit (avatar, name, phone, city, ward — whitelisted); preferences; privacy settings; badges; contribution history; settings; help; privacy policy; terms. |
| Privacy & data protection | Implemented | Profile visibility, location precision, Aadhaar masking, data download (`download-my-data` edge function), account deletion (30-day grace), logout-all-devices, clear location history. |
| Accessibility | Implemented | Font scale, high contrast, reduce motion, screen reader hints, larger touch targets (persisted locally + server). |
| i18n | Implemented | English + Hindi. |
| Realtime | Implemented | Complaint lifecycle, notifications, nearby — all via Supabase postgres_changes. |

### 7.2 Admin Web Dashboard

| Module | Status | Notes |
|--------|--------|------|
| Login | Implemented | Supabase Auth; role from `app_metadata.role`. |
| Dashboard (Civic Command Center) | Implemented | KPIs, interactive map, complaint list, AI civic insights. |
| Complaints list | Implemented | Paginated, filters, bulk delete, status change, escalate, add note, assign. |
| Complaint detail | Implemented | Timeline, AI panel, assignment, resolution evidence, community verification, automation history, incident linking, reopen. |
| AI Review Queue | Implemented | `get_complaints_for_ai_review` RPC; human override (verify/reject/request-evidence). |
| Reopened Cases | Implemented | `get_reopened_complaints` RPC. |
| Civic Map | Implemented | Mapbox GL JS; markers/heatmap/clustering; viewport-bounded query. |
| Incidents | Implemented | `civic_incidents` + `duplicate_links`; create, link/unlink complaints, merge. |
| SLA Management | Implemented | Overview KPIs, at-risk/due-soon/breached tables, live countdowns. |
| SLA Rules | Implemented | CRUD on `sla_rules`. |
| Departments | Implemented | CRUD; category mapping; detail with stats. |
| Officers | Implemented | CRUD; department filter; detail with stats. |
| Citizens | Implemented | `list_citizens` RPC; suspend/restore (SYSTEM_ADMIN only). |
| Gamification config | Implemented | Badges CRUD, reward rules CRUD, leaderboard, level config (read-only). |
| Analytics | Implemented | Overview + complaints + resolution + departments + wards + civic health; recharts. |
| Automation Center | Implemented | Engine status, health stats, complaint stats, recent activity, execution log, failed automations retry. |
| Automation Rules | Implemented | Enable/disable, edit priority/name/conditions. |
| Safety Alerts | Implemented | `get_active_safety_alerts`; acknowledge/resolve; buzzer. |
| Notifications | Implemented | Admin inbox; mark read. |
| Settings | Implemented | Categories CRUD, notification config, roles & permissions (read-only matrix), AI verification config, demo mode. |
| Audit logs | Specified but not confirmed implemented | `logAudit()` written defensively (catches "table not found"); no Audit Logs page exists. `audit_logs` table not in version-controlled SQL. |
| Roles & Permissions | Implemented (frontend) | Read-only matrix from `lib/workflow.ts`; enforcement is per-feature via `canXxx()` helpers + server-side RPCs. |

### 7.3 Shared Backend (Supabase public schema)

| Module | Status | Notes |
|--------|--------|------|
| Auth (email + phone) | Implemented | Supabase Auth + `resolve_phone_login`. |
| Profiles | Implemented | Auto-created via trigger; reputation columns protected by trigger. |
| Complaints | Implemented | `create_complaint` RPC; PostGIS location; status history trigger; idempotency. |
| Complaint images | Implemented | `complaint_images` table; private storage bucket; signed URLs. |
| Status history | Implemented | Trigger-driven audit of status changes. |
| Notifications | Implemented | Trigger-only writes via `create_notification` (revoked from clients). |
| Device tokens | Implemented | FCM tokens; RLS-scoped. |
| Gamification engine | Implemented | `award_points` (service_role only), `check_and_award_badges`, `reward_rules`, `level_config`. |
| Community verification | Implemented | `community_verifications` + `resolution_evidence` tables + RPCs. |
| Duplicate/similarity detection | Implemented | `find_similar_complaints` (pg_trgm + PostGIS), `join_similar_complaint`, `add_evidence_to_complaint`. |
| Aadhaar KYC | Implemented | SHA-256 digest + masked; `submit_aadhaar_registration`. |
| Profile preferences/privacy | Implemented | `notify_push/email/in_app`, `privacy_show_leaderboard/ward`; `upsert_user_settings`, `upsert_notification_preference`. |
| AI verification | Specified but not confirmed implemented (in repo) | `complaint_ai_verification` table + `ai_decision` enum referenced in migrations 12–14 but never `CREATE`d in repo. AI edge function `ai-evidence-verification` referenced by mobile but not in `supabase/functions/`. Must exist on live project. |
| Officers | Specified but not confirmed implemented (in repo) | `officers` table referenced in `officer_review_complaint` but not `CREATE`d in repo. |
| Departments | Specified but not confirmed implemented (in repo) | Implied by `complaints.assigned_department_id`; not in repo. |
| SLA engine | Partially implemented | `complaints.sla_deadline` column exists but no SLA engine/population logic in repo SQL. Admin backend computes SLA on-demand. `sla_rules` table referenced by admin frontend. |
| Safety (SOS, contacts, check-in, safe places, anonymous) | Specified but not confirmed implemented (in repo) | Mobile app calls safety RPCs (`trigger_sos`, etc.); tables not in repo SQL. Must exist on live project. |
| Automation rules | Specified but not confirmed implemented (in repo) | `automation_rules`, `automation_executions`, `automation_audit_log` referenced by admin frontend; not in repo SQL. |
| Civic incidents | Specified but not confirmed implemented (in repo) | `civic_incidents`, `duplicate_links` referenced by admin frontend; not in repo SQL. |
| Audit logs | Specified but not confirmed implemented (in repo) | Referenced in migration 12; not `CREATE`d; admin frontend `logAudit()` catches missing table. |
| Push notifications (edge function) | Implemented | `send-push-notifications` edge function; FCM v1; drains `notifications` outbox. |

### 7.4 Express + Prisma Backend (`ADMIN/backend/`) — Parallel Stack

| Module | Status | Notes |
|--------|--------|------|
| REST API (57 endpoints) | Implemented | Express + Zod validation + Prisma. **Not wired to admin frontend.** |
| JWT auth + refresh rotation | Implemented | Opaque refresh tokens stored as SHA-256 digest. |
| Firebase auth mode | Implemented | `AUTH_MODE=firebase`. |
| Cloudinary image uploads | Implemented | Signed upload params; separate from Supabase Storage. |
| FCM push | Implemented | `firebase-admin`. |
| Socket.IO realtime | Implemented | Per-user/department/admin rooms. |
| SLA computation | Implemented (on-demand) | Computed at query time; no background monitor; `SLA_WARNING` never sent. |
| Department/officer assignment | Implemented (manual) | `PATCH /complaints/:id/assign`; no auto-assignment by category. |
| AI validation | Missing | No AI logic in Express backend. |
| Automation engine | Missing | No cron/queue; `REDIS_URL` declared but unused. |
| Safety/police | Missing | Only a seeded "Public Safety" department. |
| Tests | Partial | Vitest + Supertest; ~3 files covering happy paths. |

---

## 8. Complaint Lifecycle (Summary)

See `JANMITRA_COMPLAINT_LIFECYCLE.md` for the full state machine. The repo enum
defines 6 statuses; the live schema (per mobile/admin code) uses ~19:

```
SUBMITTED → AUTO_VALIDATING / AI_CHECKING → AI_VERIFIED → VERIFIED → ASSIGNED
  → ACKNOWLEDGED → IN_PROGRESS → RESOLUTION_SUBMITTED → UNDER_REVIEW
  → COMMUNITY_VERIFICATION → RESOLVED → CLOSED
  ↘ AI_REVIEW_REQUIRED → EVIDENCE_REQUIRED → (citizen adds evidence) → AI_CHECKING
  ↘ AI_FAILED → EVIDENCE_REQUIRED
  ↘ REJECTED
  ↗ REOPENED (from RESOLVED/CLOSED via community verification or admin)
```

The version-controlled SQL only enforces transitions for the 6 core values; the
extended AI/SLA/community states are enforced by RPCs and triggers on the live
project.

---

## 9. Security, Deployment, Testing, Maintenance, Future Roadmap

- **Security:** Supabase Auth, RLS on every table, SECURITY DEFINER RPCs for
  privileged writes, service-role keys only in edge functions, reputation columns
  protected by trigger, signed URLs for private storage. See
  `JANMITRA_SECURITY_SPEC.md`.
- **Deployment:** Supabase project (hosted) + Flutter mobile build + Vite admin
  build. Express backend optional (Docker). See `JANMITRA_DEPLOYMENT_GUIDE.md`.
- **Testing:** Mobile has a `test/` dir (Flutter widget tests). Admin frontend has
  no tests. Express backend has Vitest integration tests. See
  `JANMITRA_TESTING_STRATEGY.md`.
- **Future roadmap:** See `JANMITRA_ROADMAP.md`, based on gaps in
  `JANMITRA_GAP_ANALYSIS.md`.

---

## 10. Documentation Map

| # | Document | Purpose |
|---|----------|---------|
| 00 | MASTER_PROJECT_DOCUMENT (this) | Overview + feature inventory |
| 01 | SRS | Software Requirements Specification |
| 02 | PRD | Product Requirements Document |
| 03 | BRD | Business Requirements Document |
| 04 | FRD | Functional Requirements Document |
| 05 | USER_STORIES | User stories + acceptance criteria |
| 06 | USE_CASES | Use-case catalog |
| 07 | END_TO_END_WORKFLOWS | Workflow diagrams |
| 08 | COMPLAINT_LIFECYCLE | State machine spec |
| 09 | AI_VALIDATION_SPEC | AI evidence validation |
| 10 | EVIDENCE_MANAGEMENT | Evidence lifecycle |
| 11 | DEPARTMENT_OFFICER_MANAGEMENT | Assignment logic |
| 12 | SAFETY_RESPONSE_SPEC | Women safety + police response |
| 13 | SLA_SPEC | SLA configuration & monitoring |
| 14 | GAMIFICATION_SPEC | Points/badges/levels/leaderboard |
| 15 | NOTIFICATION_SPEC | Notification triggers & channels |
| 16 | REALTIME_SPEC | Realtime architecture |
| 17 | DATABASE_DESIGN | Table-by-table design |
| 18 | DATA_DICTIONARY | Field-by-field dictionary |
| 19 | API_DOCUMENTATION | RPC + REST endpoints |
| 20 | SECURITY_SPEC | Security architecture |
| 21 | RBAC_MATRIX | Role/permission matrix |
| 22 | ADMIN_DASHBOARD_SPEC | Admin page-by-page spec |
| 23 | MOBILE_APP_SPEC | Screen-by-screen spec |
| 24 | GEOLOCATION_SPEC | Map & geolocation |
| 25 | ANALYTICS_SPEC | Dashboard analytics |
| 26 | AUTOMATION_SPEC | Automation rules engine |
| 27 | AUDIT_LOG_SPEC | Audit trail |
| 28 | TESTING_STRATEGY | Test approach |
| 29 | TEST_CASES | Detailed test cases |
| 30 | ERROR_HANDLING | Failure handling |
| 31 | DEPLOYMENT_GUIDE | Deployment |
| 32 | DEVELOPMENT_SETUP | Local dev setup |
| 33 | CICD | CI/CD |
| 34 | UI_UX_GUIDELINES | Design system |
| 35 | ACCESSIBILITY | Accessibility spec |
| 36 | PRIVACY_DATA_PROTECTION | Privacy |
| 37 | AI_EVALUATION_PLAN | AI model evaluation |
| 38 | DEMO_DATA_SPEC | Demo data |
| 39 | TRACEABILITY_MATRIX | Requirement traceability |
| 40 | GAP_ANALYSIS | Gap analysis |
| 41 | KNOWN_ISSUES | Known issues register |
| 42 | ROADMAP | Project roadmap |
| 43 | HANDOVER | Handover document |
| 44 | TROUBLESHOOTING | Troubleshooting guide |
| 45 | ADR | Architecture Decision Records |
| 46 | GLOSSARY | Glossary |
| 47 | DOCUMENTATION_STATUS | Documentation status |
