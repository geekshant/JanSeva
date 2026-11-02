# JanMitra — Architecture Decision Records (ADR)

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Convention:** `ADR-<n>`.

---

## ADR-001 — Supabase as the primary backend

- **Context:** Need Auth, DB, Storage, Realtime, Edge Functions with minimal ops.
- **Options:** Supabase; Firebase; custom Node+Postgres; Appwrite.
- **Decision:** Supabase (Postgres + Auth + Storage + Realtime + Edge Functions).
- **Consequences:** RLS-first security model; PostgREST RPCs; Realtime via postgres_changes; Edge Functions (Deno); vendor lock-in to Supabase primitives. Positive: rapid development, integrated auth/realtime/storage. Negative: limited to Supabase capabilities; realtime scaling tied to platform.
- **Status:** Accepted (implemented).

## ADR-002 — Flutter for the citizen mobile app

- **Context:** Cross-platform mobile (Android + iOS) with camera, location, maps, push.
- **Options:** Flutter; React Native; native; Kotlin Multiplatform.
- **Decision:** Flutter (Dart 3.13+).
- **Consequences:** Single codebase; Riverpod state; go_router; supabase_flutter; flutter_map. Positive: performance, single team. Negative: Dart ecosystem smaller; map library is flutter_map not Google Maps.
- **Status:** Accepted (implemented).

## ADR-003 — React + Vite + TypeScript for the admin dashboard

- **Context:** Internal admin SPA with charts, maps, tables, realtime.
- **Options:** React+Vite; Next.js; Angular; SvelteKit.
- **Decision:** React 18 + Vite 5 + TS 5.6 + Tailwind + shadcn/ui + TanStack Query.
- **Consequences:** Fast HMR; typed; large ecosystem. Positive: shadcn/ui speed; TanStack Query caching. Negative: no SSR (not needed for internal tool); no tests/lint configured yet.
- **Status:** Accepted (implemented).

## ADR-004 — Mapbox (not Google Maps) for map tiles

- **Context:** Need map tiles + heatmap + clustering.
- **Options:** Google Maps; Mapbox; OpenStreetMap.
- **Decision:** Mapbox (flutter_map on mobile, mapbox-gl on admin).
- **Consequences:** Requires Mapbox access token; raster tiles on mobile, vector on admin. Positive: good styling. Negative: `VITE_GOOGLE_MAPS_API_KEY` legacy/unused; some admin "Google Maps" links are just URL redirects.
- **Status:** Accepted (implemented). Note: original spec mentioned Google Maps; actual implementation uses Mapbox — documented as a divergence.

## ADR-005 — Server-controlled gamification (no client point writes)

- **Context:** Prevent cheating / reputation manipulation.
- **Options:** Client computes + server validates; server-only computes.
- **Decision:** Server-only: `award_points` SECURITY DEFINER (service_role only) + `protect_reputation_columns` trigger + no INSERT RLS on rewards/user_badges.
- **Consequences:** Clients cannot write points/level/badges. Positive: anti-cheat. Negative: all awards via triggers/RPCs (less flexible).
- **Status:** Accepted (implemented).

## ADR-006 — Trigger-only notification writes (no client INSERT)

- **Context:** Prevent notification spoofing.
- **Options:** Client writes with RLS; server/trigger-only.
- **Decision:** `create_notification` SECURITY DEFINER, revoked from all API roles; no INSERT RLS policy on `notifications`.
- **Consequences:** Only DB triggers/RPCs create notifications. Positive: cannot spoof. Negative: edge function needed for push (outbox pattern).
- **Status:** Accepted (implemented).

## ADR-007 — FCM push via Edge Function outbox pattern

- **Context:** Push delivery needs Firebase Admin SDK (server-side); Flutter app can't hold server keys.
- **Options:** Client-side FCM send (insecure); Edge Function outbox.
- **Decision:** `notifications.push_sent` flag = FCM outbox; `send-push-notifications` Edge Function (service_role, firebase-admin) drains via pg_cron every 1 min.
- **Consequences:** ~1 min push latency; respects `notify_push`; prunes invalid tokens. Positive: secure, scalable. Negative: latency, pg_cron dependency.
- **Status:** Accepted (implemented).

## ADR-008 — Human-in-the-loop AI (never auto-reject)

- **Context:** AI image/category validation can be wrong.
- **Options:** Full auto-accept/reject; AI triage + human decision.
- **Decision:** AI returns PASS/REVIEW/FAIL; FAIL → EVIDENCE_REQUIRED (request more, not reject); human override via `officer_review_complaint`; AI failure → human review (never silent reject).
- **Consequences:** More human review load; safer. Positive: no false auto-rejection. Negative: edge function source not in repo (deployed separately).
- **Status:** Accepted (implemented per design; edge function source [S]).

## ADR-009 — Separate `admin` schema for Express backend

- **Context:** Express/Prisma backend needs its own tables without conflicting with mobile's `public` schema.
- **Options:** Same schema (public); separate schema (admin); separate database.
- **Decision:** Separate `admin` schema in same Supabase Postgres (`?schema=admin`).
- **Consequences:** Two parallel data models. **Negative:** raw SQL in Express hardcodes `public.complaints` (schema mismatch — KI-004); admin frontend doesn't use Express (uses Supabase directly — KI-005). **This ADR's consequence is the biggest architectural risk.**
- **Status:** Superseded/Questioned — recommend deprecating Express or aligning schemas.

## ADR-010 — Idempotent SQL migrations

- **Context:** Migrations re-runnable for safe updates.
- **Options:** Forward-only; idempotent.
- **Decision:** All numbered SQL files idempotent (`create extension if not exists`, `on conflict do nothing`, guarded DO blocks). EXCEPT `janmitra_full_setup.sql` (drops everything).
- **Consequences:** Safe to re-run individual files; never re-run full setup on data.
- **Status:** Accepted (implemented).

## ADR-011 — Phone login via RPC (resolve_phone_login) instead of Supabase Phone Auth

- **Context:** Supabase Auth authenticates by email; citizens want phone login.
- **Options:** Supabase Phone Auth (SMS OTP, costs); RPC mapping phone→email.
- **Decision:** `resolve_phone_login` RPC maps 10-digit phone → account email; then `signInWithPassword`.
- **Consequences:** No SMS cost; but RPC granted to `anon` lets a caller who knows a phone learn the bound email (documented trade-off — KI-015).
- **Status:** Accepted (with documented trade-off).

## ADR-012 — Aadhaar KYC stores digest + masked only (never raw)

- **Context:** Aadhaar is sensitive PII; store minimal.
- **Options:** Store raw (illegal/insecure); store encrypted; store digest + masked.
- **Decision:** `sha256(digits)` digest + `XXXX XXXX 1234` masked only.
- **Consequences:** Cannot recover raw Aadhaar; can verify uniqueness + display masked. Positive: privacy. Negative: can't show last 4 to different actors (masked is fixed).
- **Status:** Accepted (implemented).

## ADR-013 — Bhopal geofence for complaint location

- **Context:** Initial deployment scoped to Bhopal.
- **Decision:** Hardcoded geofence (lat 23.10–23.40, lng 77.25–77.55) in mobile `location_step.dart`.
- **Consequences:** Prevents out-of-city reports; blocks multi-city. Must remove for scale.
- **Status:** Accepted for MVP; to revisit for multi-city.

## ADR-014 — Version-controlled SQL vs. live-applied schema (the gap)

- **Context:** Some tables (officers, departments, AI, safety, automation) were applied directly to the live project, not version-controlled.
- **Decision (current):** Live-applied; repo SQL incomplete.
- **Consequences:** Fresh setups incomplete; can't reproduce live schema; CI can't test full schema. **Critical gap.**
- **Recommendation:** Version-control ALL live DDL. See `40_GAP_ANALYSIS.md` G1.
- **Status:** Questioned — must fix.
