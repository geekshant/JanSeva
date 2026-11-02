# JanMitra — Bug & Failure Handling Document

> **Document version:** 1.0  
> **Generated:** 2026-09-30

For every error: cause, detection, UX, recovery, logging, retry, fallback.

---

## 1. Supabase Connection Failure
- **Cause:** Network down, DNS failure, Supabase outage, wrong URL/key.
- **Detection:** Supabase client throws `SupabaseNotConfiguredException` or network error; `authStateProvider` empty.
- **UX:** Placeholder mode (mobile); admin `ErrorState` with retry.
- **Recovery:** Reconnect on network restore; Supabase socket auto-reconnect.
- **Logging:** `AppLogger` warning "Supabase not configured" / network error.
- **Retry:** TanStack Query retry=1 (admin); manual refresh (mobile).
- **Fallback:** Graceful degradation (mobile continues with cached data where possible).

## 2. DNS/Hostname Failure
- **Cause:** `*.supabase.co` unreachable (ISP DNS, captive portal, firewall).
- **Detection:** Socket timeout / connection refused.
- **UX:** `error.network.connection` (mobile); admin error banner.
- **Recovery:** Auto-reconnect (socket); manual retry.
- **Logging:** Socket `closed`/`timedOut` status.

## 3. Realtime Subscription Failure
- **Cause:** WebSocket blocked (firewall), RLS denies event, channel misconfiguration.
- **Detection:** `RealtimeContext` error state (admin); socket `closed`/`timedOut` (mobile).
- **UX:** `RealtimeIndicator` red (admin); data may be stale.
- **Recovery:** Auto-reconnect (3s reset admin; socket-level mobile).
- **Logging:** Connection state logged.
- **Retry:** Automatic.
- **Fallback:** Manual refresh; `refetchOnWindowFocus` (admin).

## 4. Authentication Failure
- **Cause:** Wrong credentials, expired token, revoked session, account suspended.
- **Detection:** Supabase auth error (`InvalidCredentials`, `email_not_confirmed`); Express `INVALID_CREDENTIALS`/401.
- **UX:** Friendly i18n error (mobile); inline error (admin login).
- **Recovery:** Re-login.
- **Logging:** Auth errors logged.
- **Retry:** Rate-limited (Express 20/window).
- **Fallback:** Redirect to login.

## 5. Database Failure
- **Cause:** Postgres down, connection pool exhausted, query timeout.
- **Detection:** RPC error; Prisma error.
- **UX:** Error state with retry.
- **Recovery:** Retry; Supabase platform recovery.
- **Logging:** Postgres error message.
- **Retry:** TanStack Query retry=1.

## 6. Storage Failure
- **Cause:** Bucket misconfigured, MIME/size rejection, quota exceeded.
- **Detection:** Storage API error.
- **UX:** Per-photo status `failed` (mobile); error toast (admin).
- **Recovery:** Retry upload (mobile); re-upload (admin).
- **Logging:** Upload error logged.
- **Retry:** `retryUpload` (mobile).
- **Fallback:** Keep state + images for retry.

## 7. Image Upload Failure
- **Cause:** Network, oversized, wrong type, storage policy denial.
- **Detection:** `uploadImage` throws; status `failed`.
- **UX:** Red overlay on photo tile + retry button.
- **Recovery:** Retry; validate type/size before upload.
- **Fallback:** Pending photos retained; submission blocked until resolved or removed.

## 8. AI Analysis Failure
- **Cause:** Edge function error, timeout, edge function not deployed.
- **Detection:** `complaint_ai_verification.status = error`; stuck job (pending >2min, analyzing >5min).
- **UX:** Complaint stays in AI_CHECKING/AI_REVIEW_REQUIRED; appears in AI Review Queue.
- **Recovery:** `retry_stuck_ai_jobs()` (pg_cron every 2 min) re-invokes edge function via `net.http_post`. Max 10/run; `attempt_count` tracked.
- **Logging:** `last_error` stored; console logs.
- **Retry:** Automatic (pg_cron). Manual retry via admin.
- **Fallback:** **Never silent reject.** Routes to human review.
- **Critical:** AI failure must never become rejection.

## 9. Location Failure
- **Cause:** GPS disabled, permission denied, reverse geocode failure.
- **Detection:** `geolocator` throws/returns denied; `geocoding` failure.
- **UX:** Permission prompt; if denied, manual map still usable (reporting not blocked); reverse geocode failure ignored (non-blocking).
- **Recovery:** Re-request permission; manual selection.
- **Logging:** Warning logged.
- **Fallback:** Manual location via flutter_map tap/drag.

## 10. Google Maps / Mapbox Failure
- **Cause:** Mapbox token invalid/expired; tile server down; rate limit.
- **Detection:** Map tiles blank/error; `mapbox-gl` error event.
- **UX:** Blank map; markers may still render from data.
- **Recovery:** Validate token; retry.
- **Logging:** Mapbox error logged.
- **Fallback:** List view (admin side panel); manual address entry (mobile).

## 11. FCM Failure
- **Cause:** Firebase not configured, invalid service account, token invalid, FCM down.
- **Detection:** `send-push-notifications` edge function: Firebase init failure (500); FCM send exception.
- **UX:** In-app notification still delivered; push not delivered.
- **Recovery:** `push_sent` left false → retried next run (pg_cron). Invalid tokens pruned.
- **Logging:** "firebase-admin init failed" / "push failed for notification <id>".
- **Retry:** Automatic (next outbox drain). Max BATCH_SIZE 100/run.
- **Fallback:** In-app notification (always created by trigger).

## 12. Notification Failure
- **Cause:** Trigger error, RLS block (shouldn't happen — trigger is SECURITY DEFINER).
- **Detection:** `create_notification` error.
- **UX:** Notification not created.
- **Recovery:** Trigger retries not applicable (Postgres).
- **Logging:** Trigger error.
- **Fallback:** Status history still records the transition.

## 13. Assignment Failure
- **Cause:** Department/officer not found, inactive, soft-deleted, complaint closed.
- **Detection:** `manual_assign_complaint` RPC error; Express `PATCH /assign` 404.
- **UX:** Error dialog (admin).
- **Recovery:** Pick valid dept/officer.
- **Logging:** RPC error.
- **Fallback:** Leave unassigned; admin manually routes.

## 14. SLA Calculation Failure
- **Cause:** `sla_deadline` null, no matching `sla_rules`, clock skew.
- **Detection:** SLA state computed as null/unknown.
- **UX:** No SLA badge or "unknown".
- **Recovery:** Configure `sla_rules`; populate `sla_deadline`.
- **Logging:** —
- **Fallback:** On-demand computation (Express `evaluateSlaState`).

## 15. Analytics Failure
- **Cause:** RPC error, partial data, permission denied.
- **Detection:** `get_analytics_summary` error.
- **UX:** `InlineError` per section (admin Analytics — does NOT blank whole page).
- **Recovery:** Retry.
- **Logging:** Console.
- **Fallback:** Other sections still render.

## 16. Automation Failure
- **Cause:** Rule error, condition mismatch, action failure.
- **Detection:** `automation_executions.status = failed`; `get_failed_automations`.
- **UX:** Failed automations section in Automation Center with retry.
- **Recovery:** `retry_automation_execution` RPC.
- **Logging:** `error` field in execution; `automation_audit_log`.
- **Retry:** Manual retry button.

## 17. Build Failure
- **Cause:** TS errors, missing env, dependency issue.
- **Detection:** `tsc --noEmit` / `vite build` / `flutter build` fails.
- **UX:** Dev: error output.
- **Recovery:** Fix errors.
- **Fallback:** —
