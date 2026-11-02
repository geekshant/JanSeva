# JanMitra — Documentation Status

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> This document summarizes what was created, what was inspected, and the
> confirmed/specular/missing state of the project based on a full repository
> inspection.

---

## 1. Documents Created (48 files)

| # | File | Status |
|---|------|--------|
| 00 | MASTER_PROJECT_DOCUMENT.md | Created |
| 01 | SRS.md | Created |
| 02 | PRD.md | Created |
| 03 | BRD.md | Created |
| 04 | FRD.md | Created |
| 05 | USER_STORIES.md | Created |
| 06 | USE_CASES.md | Created |
| 07 | END_TO_END_WORKFLOWS.md | Created |
| 08 | COMPLAINT_LIFECYCLE.md | Created |
| 09 | AI_VALIDATION_SPEC.md | Created |
| 10 | EVIDENCE_MANAGEMENT.md | Created |
| 11 | DEPARTMENT_OFFICER_MANAGEMENT.md | Created |
| 12 | SAFETY_RESPONSE_SPEC.md | Created |
| 13 | SLA_SPEC.md | Created |
| 14 | GAMIFICATION_SPEC.md | Created |
| 15 | NOTIFICATION_SPEC.md | Created |
| 16 | REALTIME_SPEC.md | Created |
| 17 | DATABASE_DESIGN.md | Created |
| 18 | DATA_DICTIONARY.md | Created |
| 19 | API_DOCUMENTATION.md | Created |
| 20 | SECURITY_SPEC.md | Created |
| 21 | RBAC_MATRIX.md | Created |
| 22 | ADMIN_DASHBOARD_SPEC.md | Created |
| 23 | MOBILE_APP_SPEC.md | Created |
| 24 | GEOLOCATION_SPEC.md | Created |
| 25 | ANALYTICS_SPEC.md | Created |
| 26 | AUTOMATION_SPEC.md | Created |
| 27 | AUDIT_LOG_SPEC.md | Created |
| 28 | TESTING_STRATEGY.md | Created |
| 29 | TEST_CASES.md | Created |
| 30 | ERROR_HANDLING.md | Created |
| 31 | DEPLOYMENT_GUIDE.md | Created |
| 32 | DEVELOPMENT_SETUP.md | Created |
| 33 | CICD.md | Created |
| 34 | UI_UX_GUIDELINES.md | Created |
| 35 | ACCESSIBILITY.md | Created |
| 36 | PRIVACY_DATA_PROTECTION.md | Created |
| 37 | AI_EVALUATION_PLAN.md | Created |
| 38 | DEMO_DATA_SPEC.md | Created |
| 39 | TRACEABILITY_MATRIX.md | Created |
| 40 | GAP_ANALYSIS.md | Created |
| 41 | KNOWN_ISSUES.md | Created |
| 42 | ROADMAP.md | Created |
| 43 | HANDOVER.md | Created |
| 44 | TROUBLESHOOTING.md | Created |
| 45 | ADR.md | Created |
| 46 | GLOSSARY.md | Created |
| — | README.md (root) | Updated |
| 47 | 00_DOCUMENTATION_STATUS.md (this) | Created |

## 2. Source Files Inspected

### Database (`database/`)
All 18 SQL files: `01_schema.sql` → `16_profile_preferences.sql` + `janmitra_full_setup.sql` + `README.md`.

### Mobile (`mobile/`)
`pubspec.yaml`, `.env.example`, `analysis_options.yaml`, `main.dart`, `app.dart`, and the full `lib/` tree (core/, data/ services+repositories+models, features/ splash/auth/home/report_issue/complaints/map/verification/safety/gamification/notifications/profile/realtime).

### Admin Frontend (`ADMIN/frontend/`)
`package.json`, `.env.example`, `README.md`, `vite.config.ts`, `tailwind.config.js`, `tsconfig.json`, `index.html`, `components.json`, and `src/` (main.tsx, App.tsx, routes/, pages/ ~40 pages, components/, services/, hooks/, contexts/, lib/, types/, i18n/).

### Admin Backend (`ADMIN/backend/`)
`package.json`, `.env.example`, `README.md`, `docker-compose.yml`, `Dockerfile`, `tsconfig.json`, `vitest.config.ts`, `.eslintrc.js`, `prisma/schema.prisma`, migrations, seed.ts, and `src/` (server, app, config, db, routes, modules/auth|users|departments|complaints|notifications|rewards|analytics|uploads, middleware, utils, realtime, constants, types), `tests/`.

### Supabase Edge Functions (`supabase/functions/`)
`send-push-notifications/index.ts` (the only edge function in the repo).

## 3. Features Confirmed Implemented (evidence in repo)

- Citizen auth (email + phone login + Aadhaar KYC + password reset + one-account-per-email/phone).
- Report issue (5-step wizard: category + min 3 photos + Bhopal geofence location + details + review + duplicate detection + join-similar + idempotency).
- Complaint tracking (my complaints + detail + timeline + add evidence + delete pre-verify).
- Map (nearby + heatmap + markers + clustering + filters + realtime).
- Community verification (verifiable_complaints + submit_community_verification).
- Gamification (award_points service_role-only + reward_rules + level_config + badges + check_and_award_badges + community_leaderboard + get_reputation_summary + reputation protection trigger).
- Notifications (trigger-only create_notification + device_tokens + send-push-notifications edge function FCM v1 + in-app + realtime + per-category preferences).
- Safety (SOS + live location + trusted contacts + check-in + nearby safe places + anonymous report — all via RPCs, DB-backed).
- Profile (edit whitelisted + avatar + preferences + privacy settings + accessibility + data download [S edge fn] + account deletion 30-day + logout all + clear location history).
- Admin dashboard (login + dashboard + complaints + detail + AI review queue + reopened + civic map + incidents + SLA mgmt/rules/breached/escalations + departments + officers + citizens + gamification config + analytics + automation center/rules + safety alerts + notifications + settings).
- Realtime (Supabase postgres_changes, global + page-level, dedup, cleanup).
- RLS on every created table; SECURITY DEFINER RPCs for privileged writes.

## 4. Features Specified but Not Confirmed Implemented (in repo)

- `complaint_ai_verification` table + `ai_decision` enum (referenced in migrations 12–14, never CREATE'd).
- `officers`, `departments`, `complaint_assignments`, `assignment_audit_logs` tables.
- `audit_logs`, `system_config` tables.
- `civic_incidents`, `duplicate_links` tables.
- `sla_rules` table (admin reads it).
- `safety_alerts`, `safety_incidents`, `safety_contacts`, `safety_checkins`, `safe_places`, `anonymous_reports` tables.
- `automation_rules`, `automation_executions`, `automation_audit_log` tables.
- `user_settings`, `notification_preferences`, `notification_config`, `category_ai_config` tables.
- `ai-evidence-verification` edge function (mobile fires it; not in `supabase/functions/`).
- `download-my-data` edge function (mobile calls it; not in repo).
- Extended `complaint_status` enum (6 in repo, ~19 live).
- `complaints.assigned_department_id`, `ward`, `evidence_request_message` columns.
- Automatic officer assignment (jurisdiction/distance/workload).
- Closest-police-officer/station auto-dispatch.
- SLA warning notifications (no background monitor).

> All of the above almost certainly exist on the **live Supabase project** (applied
> directly). They are documented from inferred usage and labeled **[S]**.

## 5. Missing Features

- Audit Logs admin page (no route; `logAudit` swallows "table not found").
- SLA warning notifications (type defined, never sent).
- AI hotspots on production admin map (stub returns []).
- SMS notifications (out of scope).
- Offline-first mobile sync (out of scope).
- Multi-city rollout (out of scope).
- Admin frontend tests + linter + CI/CD (no config).
- RLS/realtime/AI/notification/accessibility automated tests.

## 6. Known Defects (see `41_KNOWN_ISSUES.md`)

- KI-004: Express raw SQL queries `public.complaints` while ORM uses `admin.*` (schema mismatch) — **Critical**.
- KI-008: Admin ComplaintsPage `dateTo` set to `dateFrom` value — **Medium**.
- KI-001/002/003: Live schema not version-controlled — **Critical**.
- KI-005: Express backend not wired to admin frontend — **High**.
- KI-006/007: AI + download-my-data edge functions not in repo — **High/Medium**.
- KI-014: `audit_logs` table not confirmed present — **High**.
- KI-017: SLA_WARNING never sent — **High**.

## 7. Architecture Inconsistencies

1. **Two parallel backends:** Express/Prisma (`admin` schema) vs Supabase-direct (`public` schema). Admin frontend uses Supabase directly; Express is disconnected.
2. **complaint_status enum:** 6 values in repo vs ~19 live.
3. **Storage:** Mobile = Supabase Storage; Express = Cloudinary.
4. **Auth:** Mobile/admin = Supabase Auth; Express = JWT + optional Firebase.
5. **Realtime:** Mobile/admin = Supabase Realtime; Express = Socket.IO.
6. **Map:** Original spec mentioned Google Maps; actual = Mapbox (documented divergence, ADR-004).

## 8. Database Inconsistencies

- Version-controlled SQL creates only ~16 tables; live schema has ~35+ (officers, departments, AI, safety, automation, SLA, audit, incidents, assignments, config, settings, preferences).
- `complaint_status` enum mismatch (6 vs ~19).
- `find_similar_complaints` returns hardcoded NULL `incident_*` columns (no `civic_incidents` in repo).

## 9. Security Concerns

- `resolve_phone_login` granted to `anon` (phone→email enumeration trade-off, KI-015).
- No route-level admin role guard (per-feature `canXxx()` only; server RLS enforces).
- `audit_logs` table not confirmed present (privileged actions may not persist).
- AI edge function safety (never silent reject) must be verified on live deployment.
- Service-role key correctly confined to edge functions (verified — not in clients).

## 10. Testing Gaps

- Admin frontend: no tests, no test script, no linter.
- No RLS automated tests (critical for security).
- No realtime/AI/notification/accessibility tests.
- No coverage measurement.
- Mobile tests minimal (widget tests only).
- No CI/CD pipeline config.

## 11. Recommended Next Implementation Priorities

1. **Critical:** Version-control the live schema (officers, departments, AI, safety, automation, SLA, audit tables + extended enum + missing columns).
2. **Critical:** Fix Express raw SQL schema mismatch (`public` vs `admin`) OR deprecate the Express backend.
3. **Critical:** Verify AI edge function never silently rejects; bring `ai-evidence-verification` source into repo.
4. **High:** Add Audit Logs page + confirm `audit_logs` table.
5. **High:** Implement SLA warning notifications (background monitor).
6. **High:** Implement automatic officer assignment (or document manual-only as intentional).
7. **High:** Add admin frontend tests + CI/CD + RLS tests.
8. **Medium:** Fix ComplaintsPage dateTo bug; resolve demo account/README inconsistencies; bring `download-my-data` edge function into repo.
9. **Medium:** SLA pause/resume; per-image evidence metadata; route-level admin guards.
10. **Low:** AI hotspots on production map; remove dead code (Express unused functions); update stale README.

---

*This documentation package was generated by inspecting the actual repository at
`D:\Janmitra\JanMitra`. Implementation status labels (Implemented / Specified but
not confirmed implemented / Missing) are used consistently across all documents.
No implementation details were fabricated; where the repo cannot confirm a feature,
it is labeled **[S]** (specified) and documented from inferred usage.*
