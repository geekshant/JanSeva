# JanMitra — Project Handover Document

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> A new developer should understand the complete system from this document.

---

## 1. Architecture Summary
JanMitra is a gamified civic engagement platform with two surfaces (Flutter mobile citizen app + React admin dashboard) over a shared Supabase project (Postgres + Auth + Storage + Realtime + Edge Functions). A parallel Express/Prisma backend exists in `ADMIN/backend/` but is **not wired to the admin frontend** (which uses Supabase directly). See `00_MASTER_PROJECT_DOCUMENT.md` §3.

## 2. Repository Structure
```
JanMitra/
├── ADMIN/
│   ├── backend/         # Express + Prisma + Socket.IO (parallel, admin schema)
│   │   ├── prisma/       # schema.prisma (15 models), migrations/, seed.ts
│   │   ├── src/          # modules/{auth,users,departments,complaints,notifications,rewards,analytics,uploads}
│   │   ├── tests/        # Vitest + Supertest (3 files)
│   │   └── Dockerfile + docker-compose.yml
│   └── frontend/        # React 18 + Vite + TS + Tailwind + shadcn/ui (PRIMARY admin)
│       └── src/
│           ├── pages/    # ~40 pages
│           ├── components/  # layout/, common/, complaints/, dashboard/, map/, etc.
│           ├── services/   # Supabase service layer (base.ts + domain files)
│           ├── hooks/       # TanStack Query hooks + realtime
│           ├── contexts/    # Auth, Realtime, Buzzer, Theme
│           ├── lib/         # supabase.ts, workflow.ts (RBAC), queryClient.ts
│           └── types/       # database.ts
├── database/            # Supabase public-schema SQL (01-16 + full_setup)
├── mobile/              # Flutter citizen app
│   └── lib/
│       ├── main.dart, app.dart
│       ├── core/        # config, constants, theme, i18n, utils, widgets, routing, accessibility
│       ├── data/        # services/, repositories/, models/
│       └── features/    # splash, auth, home, report_issue, complaints, map, verification, safety, gamification, notifications, profile, realtime
└── supabase/
    └── functions/
        └── send-push-notifications/index.ts   # only edge function in repo
```

## 3. Applications
- **Mobile:** Flutter 3.x / Dart 3.13+. Riverpod 3 + go_router 18 + supabase_flutter 2 + flutter_map (Mapbox) + firebase_messaging. `.env` bundled as asset.
- **Admin frontend:** React 18 + Vite 5 + TS 5.6 + Tailwind 3.4 + shadcn/ui (Radix) + TanStack Query 5 + Mapbox GL JS + Recharts. Static build.

## 4. Backend
- **Primary:** Supabase (public schema). RPCs, RLS, triggers, storage, realtime. Clients call directly with anon/publishable key.
- **Parallel:** Express 4 + Prisma 5 + Socket.IO + JWT + Cloudinary + firebase-admin. `admin` schema in same Postgres. 57 REST endpoints. **Not used by admin frontend.**

## 5. Database
- Supabase Postgres (PostGIS, pg_trgm, pgcrypto, pg_net, pg_cron).
- **Public schema** (mobile + shared): profiles, categories, complaints, complaint_images, complaint_status_history, rewards, reward_rules, level_config, badges, user_badges, notifications, device_tokens, resolution_evidence, community_verifications, aadhaar_kyc + [S] officers, departments, complaint_ai_verification, complaint_assignments, civic_incidents, duplicate_links, sla_rules, safety_*, automation_*, audit_logs, system_config, user_settings, notification_preferences, category_ai_config, notification_config.
- **Admin schema** (Express Prisma): users, departments, complaints, complaint_images, comments, status_history, assignments, verifications, notifications, device_tokens, points_transactions, badges, user_badges, audit_logs, refresh_sessions.
- See `17_DATABASE_DESIGN.md`, `18_DATA_DICTIONARY.md`.

## 6. Authentication
- **Mobile/admin:** Supabase Auth (email+password; phone via `resolve_phone_login`). Email verification OFF. Admin role from `app_metadata.role`.
- **Express:** JWT (HS256, 24h) + opaque refresh (7d, SHA-256 digest). Optional Firebase mode.

## 7. Storage
- `complaint_images` (private, signed URLs, owner-scoped, 10MB, jpg/png/webp).
- `avatars` (public, owner-scoped, 5MB).
- Express uses Cloudinary (parallel).

## 8. Realtime
- Supabase Realtime (postgres_changes over WebSocket). Mobile: `realtime_client`. Admin: `@supabase/supabase-js`. Global + page-level subscriptions. See `16_REALTIME_SPEC.md`.

## 9. AI
- `ai-evidence-verification` edge function [not in repo] validates images vs category/title/description. Writes `complaint_ai_verification`. Human override via `officer_review_complaint`. Retry via `retry_stuck_ai_jobs` (pg_cron). Never silent reject.

## 10. Maps
- Mapbox (flutter_map on mobile, mapbox-gl on admin). PostGIS for queries. Bhopal geofence. NOT Google Maps.

## 11. Notifications
- In-app: `notifications` table (trigger-only writes). Push: `send-push-notifications` edge function (FCM v1, drains outbox via pg_cron).

## 12. Deployment
- Supabase hosted. Mobile → APK/AAB/IPA. Admin frontend → static `dist/`. Express → Docker (optional). Edge functions → `supabase functions deploy`. See `31_DEPLOYMENT_GUIDE.md`.

## 13. Environment Variables
- Mobile: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `MAPBOX_ACCESS_TOKEN`, `FIREBASE_*`, `APP_ENV`.
- Admin frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAPBOX_ACCESS_TOKEN`, `VITE_MAP_MODE`, `VITE_DATA_MODE`.
- Express: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `CLOUDINARY_*`, `FIREBASE_SERVICE_ACCOUNT`.
- Edge: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_SERVICE_ACCOUNT`.
- See `31_DEPLOYMENT_GUIDE.md` (never commit secrets).

## 14. Known Issues (Top 5)
1. Live schema not version-controlled (officers/departments/AI/safety/automation/SLA/audit tables). **Critical.**
2. Express raw SQL schema mismatch (`public` vs `admin`). **Critical.**
3. `ai-evidence-verification` edge function not in repo. **High.**
4. No Audit Logs page; `audit_logs` not confirmed present. **High.**
5. SLA warning notifications never sent (no background monitor). **High.**
See `41_KNOWN_ISSUES.md` for full register.

## 15. Testing
- Mobile: `flutter test` (minimal). Admin frontend: **no tests**. Express: `npm test` (Vitest, 3 files). No CI/CD. See `28_TESTING_STRATEGY.md`.

## 16. Troubleshooting
See `44_TROUBLESHOOTING.md`.

## 17. Operational Procedures
- **Start dev:** `cd mobile && flutter run` + `cd ADMIN/frontend && npm run dev` + (optional) `cd ADMIN/backend && npm run dev`.
- **Apply migration:** Supabase SQL Editor → run numbered file.
- **Deploy edge fn:** `supabase functions deploy send-push-notifications` + `supabase secrets set FIREBASE_SERVICE_ACCOUNT=...`.
- **Schedule push:** `SELECT cron.schedule('push-outbox', '* * * * *', ...net.http_post...)`.
- **Schedule AI retry:** `SELECT cron.schedule('retry-ai-jobs', '*/2 * * * *', 'SELECT public.retry_stuck_ai_jobs()')`.
- **Create admin user:** Dashboard > Auth > set `app_metadata.role`.
- **Check advisors:** `supabase_get_advisors` (security/performance).

## 18. Where to Start as a New Developer
1. Read `00_MASTER_PROJECT_DOCUMENT.md` (overview + the two-backends finding).
2. Read `32_DEVELOPMENT_SETUP.md` (get it running).
3. Read `17_DATABASE_DESIGN.md` (data model).
4. Read `19_API_DOCUMENTATION.md` (RPCs).
5. Read `42_ROADMAP.md` + `40_GAP_ANALYSIS.md` (what's missing).
6. Read `41_KNOWN_ISSUES.md` (what's broken).
