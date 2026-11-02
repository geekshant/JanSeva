# JanMitra — Notification Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Implementation status:** Implemented (repo `06_notifications.sql` + `send-push-notifications` edge function).

---

## 1. Channels

| Channel | Mechanism | Status |
|---------|-----------|--------|
| In-app | `notifications` table + Realtime | Implemented |
| Push | FCM via `send-push-notifications` edge function | Implemented |
| SMS | — | Not implemented (out of scope) |
| Email | — | Not implemented (notifications only) |

## 2. Notification Triggers (DB events → `notifications` rows)

`create_notification()` is SECURITY DEFINER and **revoked from all API roles** —
only triggers call it. There is intentionally **no INSERT RLS policy** so clients
cannot spoof notifications.

| Event | Trigger/Function | Title/Message | Recipient |
|-------|-------------------|---------------|-----------|
| Complaint submitted | `notify_complaint_submitted()` (complaints AFTER INSERT) | "Complaint submitted" | Citizen |
| Status → VERIFIED | `notify_complaint_status_change()` | "Complaint verified" | Citizen |
| Status → ASSIGNED | same | "Complaint assigned" | Citizen |
| Status → IN_PROGRESS | same | "Complaint in progress" | Citizen |
| Status → RESOLVED | same | "Complaint resolved" | Citizen |
| Status → REJECTED | (skipped in 06 trigger) | — | — |
| Reward earned/deducted | `notify_reward_earned()` (rewards AFTER INSERT) | "Reward earned" / "Points deducted" | Citizen |
| Badge earned | `notify_badge_earned()` (user_badges AFTER INSERT) | "Badge earned" | Citizen |
| Officer review (verify/reject/evidence) | inside `officer_review_complaint()` (12) | per decision | Citizen |
| Assignment | (admin/automation) | "Assigned to <dept>" / "New complaint assigned" | Citizen + Officer |
| SLA warning | — | — | **Missing** (never sent) |

## 3. Notification Table

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | |
| `title` | text | |
| `message` | text | |
| `type` | text | COMPLAINT_SUBMITTED, COMPLAINT_VERIFIED, COMPLAINT_ASSIGNED, COMPLAINT_IN_PROGRESS, COMPLAINT_RESOLVED, REWARD_EARNED, BADGE_EARNED, COMPLAINT_REJECTED, EVIDENCE_REQUIRED |
| `is_read` | boolean default false | |
| `read_at` | timestamptz | |
| `complaint_id` | uuid FK→complaints | |
| `data` | jsonb | |
| `push_sent` | boolean default false | FCM outbox flag |
| `created_at` | timestamptz | |

## 4. Push Delivery (Edge Function)

`send-push-notifications` (Supabase Edge Function, FCM v1 via `firebase-admin@12`):
1. Invoked every 1 min by pg_cron/pg_net (with service_role key).
2. Selects up to 100 `notifications` where `push_sent=false`, ordered by `created_at`.
3. Fetches `profiles.notify_push` — skips opted-out users (still marks `push_sent=true`).
4. Fetches `device_tokens` per user.
5. Sends FCM multicast (`sendEachForMulticast`) with `android.priority: high` + flat string `data` payload.
6. Marks `push_sent=true` on success/skip; leaves `false` on failure (retry next run).
7. Prunes invalid tokens (error codes: registration-token-not-registered, invalid-registration-token, invalid-argument).

## 5. Device Tokens

`device_tokens` (RLS-scoped to own):
- `registerDeviceToken`: upsert on `device_tokens` (onConflict: token) with platform (android/ios/web).
- `unregisterDeviceToken`: delete.
- `deviceTokenRegistrationProvider` (mobile): watches auth, registers token, respects `notify_push`, handles `onTokenRefresh`.

## 6. In-App Notifications

- `fetchNotifications`, `fetchUnreadCount`, `markAsRead` (optimistic), `markAllAsRead`.
- Tap → navigate (complaint detail if `complaint_id`, rewards for reward/badge, else home).
- Realtime: channel `notifications:user:$profileId`, ALL events, dedupe by timestamp.
- Nav badge: `unreadNotificationsCountProvider`.

## 7. Push Navigation

- `pushNavigationProvider` (root app): `onMessageOpened` + `getInitialMessage` →
  `complaint_id` → `/complaint/<id>`, else notifications center.
- Foreground messages shown via `flutter_local_notifications` (Android channel `janmitra_alerts`).

## 8. Per-Category Preferences [S]

`notification_preferences` table + `upsert_notification_preference` RPC:
categories: complaint_status, ai_result, community_verification, resolution, reopened_rejected, sla_warning, rewards, announcements, product_updates. Channels: push, email, sms, in_app.

## 9. Admin Notifications

- Admin inbox (`notifications` page): paginated, mark read, unread-only filter, realtime.
- Admin notification config (`notification_config`): toggle in-app/push per event type.

## 10. Event → Recipient → Channel Matrix

| Event | Recipient | In-app | Push | Timing |
|-------|-----------|--------|------|--------|
| Complaint submitted | Citizen | ✅ | ✅ | Immediate (trigger) |
| Verified/Assigned/In-Progress/Resolved | Citizen | ✅ | ✅ | Immediate (trigger) |
| Evidence required | Citizen | ✅ | ✅ | Officer review |
| Reward earned/deducted | Citizen | ✅ | ✅ | Immediate (trigger) |
| Badge earned | Citizen | ✅ | ✅ | Immediate (trigger) |
| New complaint assigned | Officer | ✅ | ✅ | Assignment |
| New complaint (admin) | Admin | ✅ | ✅ | Dashboard toast + chime |
| SLA breach/escalation | Admin | ✅ (toast) | — | Reactive (query) |
| New safety alert | Responder/Admin | ✅ + buzzer | — | Realtime + 15s poll |
| SLA warning | Officer/Admin | — | — | **Missing** |
