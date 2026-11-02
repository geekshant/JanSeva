# JanMitra — Troubleshooting Guide

> **Document version:** 1.0  
> **Generated:** 2026-09-30

---

## Login Failure
- **Mobile:** Check `SUPABASE_URL`/`SUPABASE_ANON_KEY` in `.env`; verify email verification OFF; for phone login verify `resolve_phone_login` RPC exists (`12_phone_login.sql` applied); check friendly error mapping.
- **Admin:** Same env; verify `app_metadata.role` set on user; check anon key not service-role.
- **Express:** Check `JWT_SECRET` ≥32 chars; `DATABASE_URL` correct; `CORS_ORIGINS` includes frontend origin.

## Supabase Connection Failure
- Verify `SUPABASE_URL` reachable (browser). Check `.env` loaded (`flutter_dotenv` bundles as asset — ensure `assets: - .env` in pubspec). App enters placeholder mode if missing. Check network/firewall. Check Supabase dashboard status.

## DNS / Hostname Failure
- `*.supabase.co` blocked? Try alternate DNS (1.1.1.1); check captive portal; corporate firewall. Realtime WebSocket may be blocked even if REST works.

## Realtime Errors
- **No events:** Add tables to Realtime publication (Dashboard > Database > Replication). Verify filter column name + value type. Verify RLS allows the event (client only receives rows it can SELECT).
- **Socket closed/timedOut:** Auto-reconnect; check network; check Supabase Realtime service.
- **Admin indicator red:** Check `RealtimeContext`; WebSocket may be down.
- **Duplicate events:** Dedup sets should handle; verify `commit_timestamp + event + id` dedup.

## Database Errors
- **PGRST202/PGRST205 ("could not find function/table"):** Run missing migration (e.g., `13_aadhaar_kyc.sql`). Apply all numbered files in order.
- **RLS denies:** Verify you're the owner; verify `current_profile_id()`/`auth.uid()` match; admin needs `is_admin()` role.
- **Constraint violation:** title 3–200 chars; severity enum; status enum (6 in repo — extended values need live enum); level ≥1; phone/email uniqueness; Aadhaar name ≥3.

## RLS Errors
- "View all complaints" returns empty → by design (no "view all" policy; citizens see own only).
- Cannot write points → by design (`protect_reputation_columns` trigger).
- Cannot insert notification → by design (no INSERT policy; trigger-only).

## Storage Errors
- **Upload fails:** Check bucket exists (`complaint_images` private, `avatars` public); MIME jpg/png/webp; size ≤10MB (complaints)/5MB (avatars); owner-scoped path `<uid>/...`; signed URL expiry (3600s).
- **Cannot read image:** Private bucket needs signed URL; verify `storage.foldername(name)[1] = auth.uid()`.

## Image Upload Failure
- Check type/size before upload; check network; `uploadImage` status `failed` → retry; ensure bucket policy allows owner path.

## AI Analysis Failure
- **Stuck (pending/analyzing):** `retry_stuck_ai_jobs()` (pg_cron every 2 min) re-invokes `ai-evidence-verification` edge function. Verify pg_cron enabled + scheduled. Verify `system_config` has `SUPABASE_URL`/`SUPABASE_ANON_KEY`. Verify pg_net extension.
- **Edge function not deployed:** `supabase functions deploy ai-evidence-verification` [S — source not in repo].
- **Never silent reject:** AI failure must route to human review. If complaints auto-rejected on AI failure, audit the edge function.

## Google Maps / Mapbox Failure
- **Blank tiles:** Check `MAPBOX_ACCESS_TOKEN`/`VITE_MAPBOX_ACCESS_TOKEN` valid + not rate-limited. Check network. Mapbox token must have correct scopes.
- **Markers missing but map shows:** Data query failed — check RPC/PostGIS.

## Location Permission Failure
- **Mobile:** `geolocator` permission denied → request; if permanently denied, manual map still usable. Check Android manifest + iOS Info.plist permissions. Bhopal geofence — outside bounds → error + clear.

## FCM Failure
- **No push:** Check `FIREBASE_SERVICE_ACCOUNT` secret set (`supabase secrets set`); check edge function deployed; check pg_cron schedule for outbox drain; check `device_tokens` has tokens; check `profiles.notify_push` true; check FCM project config (google-services.json/GoogleService-Info.plist).
- **Invalid tokens:** Edge function prunes automatically; verify `INVALID_TOKEN_CODES` handling.

## Notification Failure
- In-app: verify `create_notification` trigger fires (SECURITY DEFINER, revoked from clients — only triggers write). Check `notifications` table has rows. Check Realtime subscription.
- Push: see FCM Failure.

## Assignment Failure
- `manual_assign_complaint` fails: verify department/officer exists, active, not soft-deleted; verify complaint not closed/terminal. Check RPC `is_admin()`/officer authorization.

## Analytics Failure
- `get_analytics_summary` error: check RPC exists on live project; check permissions (admin). Admin frontend uses `InlineError` per section (partial failure doesn't blank page).
- Express analytics: raw SQL queries `public.complaints` — schema mismatch (KI-004) may cause failure.

## Automation Failure
- Failed executions: `get_failed_automations` → `retry_automation_execution`. Check `automation_audit_log`. Verify automation engine running on live project [S].

## Build Failure
- **Mobile:** `flutter pub get`; check Dart SDK ^3.13.3; check `.env` in pubspec assets.
- **Admin frontend:** `npm install`; `npm run typecheck` (tsc --noEmit) for TS errors; `npm run build`.
- **Express:** `npm install`; `npx prisma generate`; `npm run build`; check `DATABASE_URL` + `sslrootcert`.

## Deployment Failure
- Supabase migrations: run in SQL Editor; check for errors; all files idempotent (safe to re-run) EXCEPT `janmitra_full_setup.sql` (drops everything).
- Edge function: verify `supabase` CLI logged in; verify project ref; verify secrets set.
- Mobile: check signing config (Android keystore / iOS provisioning).
- Admin frontend: check env vars (VITE_*); check static host config.

## Mobile Overflow / Layout Errors
- Use Flutter DevTools; check `MediaQuery` usage; check `flutter_map` version ^8 API; check safe area; check `flutter_lints` analysis_options.

## Admin Dashboard Loading Errors
- Check Supabase connection (env vars); check anon key; check RLS (role); check TanStack Query (staleTime 5min); check Realtime indicator; check browser console for RPC errors; check network tab for 4xx/5xx.
