# JanMitra — Functional Requirements Document (FRD)

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Convention:** Each module documents every function with actor, flow, data, and implementation status.

Implementation status key: **[I]** Implemented · **[S]** Specified but not confirmed implemented (in repo) · **[M]** Missing.

---

## Module A — Citizen App

### A1. Registration [I]
- **Actor:** Citizen. **Flow:** Enter name, email, phone (10-digit, validated), password (strength checked) → `auth.signUp(email, password, data:{name, phone})` → `handle_new_user` trigger creates `profiles` row (normalized phone) → auto sign-in → `/home`. Phone uniqueness pre-checked via `resolve_phone_login`.
- **Data:** `auth.users`, `profiles`. **Validation:** email format, phone `isValidPhone`, password `isValidPassword`.

### A2. Login [I]
- **Actor:** Citizen. **Flow:** Enter identifier (email or phone) + password → if email, `signInWithPassword`; if phone, `resolve_phone_login` RPC → email → `signInWithPassword`. Friendly error mapping.
- **Data:** `auth.users`, `profiles`.

### A3. Logout [I]
- **Actor:** Citizen. **Flow:** Confirm → `signOut()` → `invalidateUserScopedData` (clears 9 providers) → `/login`.

### A4. Password reset [I]
- **Actor:** Citizen. **Flow:** Email → `resetPasswordForEmail` → deep link → `passwordRecovery` event → `/reset-password` → new password → `updateUser(password)`.

### A5. Aadhaar KYC registration [I]
- **Actor:** Citizen. **Flow:** Pre-fill name → enter Aadhaar (12-digit, formatted `XXXX XXXX XXXX`) → consent checkbox → `submit_aadhaar_registration` RPC (stores `sha256(digits)` + masked, status `verified`). Optional/skippable.
- **Data:** `aadhaar_kyc`.

### A6. Profile [I]
- **Edit:** avatar (camera/gallery → `avatars` bucket), name (2–80), phone (10–15 digits, normalized), city, ward. Whitelisted update only.
- **Preferences:** notify_push/email/in_app, privacy_show_leaderboard/ward — persisted immediately.
- **Privacy settings:** profile visibility (4 levels), location precision (exact/block/ward/city), Aadhaar masking, notifications, language, app permissions (info-only), data & account (download-my-data edge fn, logout all devices, delete account 30-day grace + cancel), accessibility (font scale, high contrast, reduce motion, screen reader hints, larger touch targets — persisted locally + server via `upsert_user_settings`).
- **Data:** `profiles`, `user_settings`, `notification_preferences`, `avatars` bucket.

### A7. Report complaint [I]
- **Actor:** Citizen. **5-step wizard:**
  1. Category (grid from `categoriesWithAiConfigProvider` — joins `category_ai_config`).
  2. Photos (camera/gallery, min 3, max 5; jpg/jpeg/png/webp, ≤10MB; per-photo lifecycle pending→uploading→uploaded/failed/rejected; auto-upload; retry).
  3. Location (GPS button + flutter_map/Mapbox + tap/drag marker; Bhopal geofence; reverse geocode via `geocoding`).
  4. Details (title 3–200 chars, description, severity low/medium/high/critical).
  5. Review (summary + `find_similar_complaints` on enter; if match → `SimilarComplaintsSheet` → "Submit & Join" or new).
- **Submit:** generate idempotency key `jm_<uid8>_<ts>_<hash>` → upload pending → `create_complaint` or `join_similar_complaint` RPC → fire-and-forget `ai-evidence-verification` edge function if status==AI_CHECKING → `/report-success`.
- **Data:** `categories`, `category_ai_config`, `complaints`, `complaint_images`, `complaint_images` bucket, `rewards`.

### A8. Complaint tracking [I]
- **My Complaints:** list (limit 100), search, filter (All/Active/Resolved/Reopened), sort, realtime.
- **Detail:** header, assignment (dept/officer/ward/routing method), AI status banner (AI_CHECKING/AI_VERIFIED/AI_REVIEW_REQUIRED/AI_FAILED/EVIDENCE_REQUIRED), incident card (citizen count), evidence gallery (round 1 original vs round 2+ additional), description, location, timeline (6 steps), resolution evidence. Delete (pre-verification only). Add evidence (EVIDENCE_REQUIRED/AI_FAILED → `add_evidence_to_complaint`).
- **Data:** `complaints` (+ joins), `complaint_images`, `complaint_status_history`, `resolution_evidence`, `complaint_assignments`.

### A9. Nearby issues / Map / Heatmap [I]
- **Map:** flutter_map + Mapbox; radius selector (500m–10km); category/status filters; display mode (markers/heatmap/both); clustering; user location marker; marker detail sheet; "search this area".
- **Data:** `nearby_complaints` RPC, `nearby_complaints_heatmap` RPC, Realtime on `complaints` + `complaint_images`.

### A10. Community verification [I]
- **Flow:** list nearby resolved+pending complaints (before/after photos, counts) → detail → comment + mandatory verification photos → `submit_community_verification` RPC (Confirm/Dispute).
- **Data:** `verifiable_complaints` RPC, `submit_community_verification` RPC, `complaint_images` bucket.

### A11. Gamification [I]
- **Rewards screen:** reputation summary card (points, level, progress), badge grid, reward rules, contribution history. Pull-to-refresh.
- **Leaderboard:** top-3 podium + full list, `is_me` highlight.
- **Data:** `get_reputation_summary` RPC, `reward_rules`, `badges`, `user_badges`, `rewards`, `level_config`, `community_leaderboard` RPC.

### A12. Safety [I] (all DB-backed via RPCs)
- **SOS:** long-press pulsing button → 3-2-1 countdown → `trigger_sos` (lat/lng/address/message) → fetch contacts count → live location sharing every 15s via `share_location` → cancel via `cancel_sos`.
- **Trusted contacts:** max 3; CRUD via `fetch_safety_contacts`/`add_safety_contact`/`update_safety_contact`/`delete_safety_contact`.
- **Safety check-in:** `create_safety_checkin` (15/30/60/120 min) → countdown → `complete_safety_checkin`; auto-SOS on miss.
- **Nearby safe places:** `find_nearby_safety_places` (POLICE/HOSPITAL/SAFE_PLACE); call + Google Maps directions.
- **Anonymous report:** message + optional location → `submit_anonymous_report`.
- **Emergency call:** 112 via `url_launcher`.

### A13. Notifications [I]
- **In-app:** list, mark read (optimistic), mark all read, tap → navigate, realtime.
- **Push:** FCM device token upsert, respects `notify_push`, tap navigation (`complaint_id` → detail).
- **Data:** `notifications`, `device_tokens`, Realtime on `notifications`.

---

## Module B — Admin Dashboard

### B1. Dashboard [I]
- KPI row, interactive Mapbox map (markers/heatmap/clustering), complaint list, AI civic insights, filters, search, realtime.

### B2. Complaints list [I]
- Paginated table (relations: profile, category, images, AI verification). Filters: search, status, severity, category, SLA, sort, date. Actions: view, assign, change status, escalate, add note, bulk delete. Realtime.

### B3. Complaint detail [I]
- Full relations. Workflow timeline. AI verification panel (verify/reject/request-evidence). Assign/reassign. Add note. Escalate. Link/unlink civic incident. Reopen. Resolution evidence. Community verification. Automation history. Realtime.

### B4. AI Review Queue [I]
- `get_complaints_for_ai_review` RPC. Table: number, category, title, location, AI result (PASS/REVIEW/FAIL), AI confidence, AI alert, evidence count, priority, submitted time. Row → detail with `?ai-review=true`.

### B5. Reopened Cases [I]
- `get_reopened_complaints` RPC. Table: number, category, title, previous resolution, current status, reopened by, reason, priority, time.

### B6. Civic Map [I]
- Mapbox GL JS full-screen split view. `get_map_complaints` (viewport-bounded PostGIS). Markers/heatmap/clustering. Side list panel. Stats overlay. Legend.

### B7. Incidents [I]
- `civic_incidents` + `duplicate_links`. Create, list, detail (linked complaints, photos, stats, merge, link/unlink). `find_nearby_complaints` RPC (graceful failure).

### B8. SLA Management [I]
- Overview: 6 KPI cards (on_track, due_soon, at_risk, breached, escalated, resolved), lifecycle visual, 3 tables (at-risk, due-soon, breached with countdowns). Realtime.
- **SLA Rules:** CRUD (`sla_rules`: deadline_hours, warning_hours, critical_hours, active).
- **SLA Breached:** detailed list. **SLA Escalations:** detailed list.

### B9. Departments [I]
- CRUD (`departments`: name, code, service area, category mapping count, status). Detail with stats. Realtime.

### B10. Officers [I]
- CRUD (`officers` joined to `profiles` + `departments`: avatar+name+title, department, role, status). Detail with stats. Realtime.

### B11. Citizens [I]
- `list_citizens` RPC (paginated, search). Suspend/restore (SYSTEM_ADMIN only). Detail with stats, badges, rewards, complaints.

### B12. Gamification config [I]
- Badges CRUD, reward rules CRUD, leaderboard (scope all_time/monthly, ward filter), level config (read-only), civic missions overview.

### B13. Analytics [I]
- Overview: KPIs, trend chart, category distribution, status breakdown (pie), AI analytics, SLA summary, department performance. Sub-pages: complaints, resolution, departments, wards, civic health.

### B14. Automation Center [I]
- Engine status, 12 health stat cards, 8 complaint stat cards, recent activity feed, execution summary, automation rules table (per-rule stats), execution log (filterable), failed automations retry. Realtime.

### B15. Automation Rules [I]
- Enable/disable, edit priority/name/conditions (`automation_rules`).

### B16. Safety Alerts [I]
- `get_active_safety_alerts`. Flashing banner. Alert cards (user info, location Google Maps link, time, message, trusted contacts call links). Acknowledge/resolve. Buzzer (test/mute/unmute). Realtime + 15s polling.

### B17. Notifications [I]
- Admin inbox (paginated, mark read, unread-only filter). Realtime.

### B18. Settings [I]
- Categories CRUD, notification config (per event type), roles & permissions (read-only matrix), AI verification config (per-category: requires_images, min/max images, different angles, ai_enabled, auto_pass, auto_fail, review_threshold, category_hints), demo mode (toggle, seed, advance).

### B19. Audit logs [S]
- `logAudit()` calls throughout admin; catches "table not found" (42P01) gracefully. No Audit Logs page. `audit_logs` table not in version-controlled SQL.

---

## Module C — Shared Backend

### C1. Auth [I]
- Supabase Auth (email/password). Phone login via `resolve_phone_login`. Admin role from `app_metadata.role`.

### C2. Complaints [I]
- `create_complaint` RPC (SECURITY DEFINER, idempotent, PostGIS). Status history triggers. Notification triggers. Reward triggers.

### C3. Evidence [I]
- `complaint_images` table + private `complaint_images` bucket + signed URLs. `add_evidence_to_complaint` RPC. `resolution_evidence` table.

### C4. Gamification [I]
- `award_points` (service_role only), `check_and_award_badges`, `reward_rules`, `level_config`. Reputation protected by trigger.

### C5. Notifications [I]
- `create_notification` (trigger-only, revoked from clients). `device_tokens`. `send-push-notifications` edge function (FCM v1).

### C6. Community verification [I]
- `community_verifications` + `resolution_evidence` tables. `submit_community_verification` + `verifiable_complaints` RPCs.

### C7. Duplicate detection [I]
- `find_similar_complaints` (pg_trgm + PostGIS), `join_similar_complaint`, `add_evidence_to_complaint`.

### C8. Aadhaar KYC [I]
- `submit_aadhaar_registration` (sha256 + masked).

### C9. AI validation [S]
- `complaint_ai_verification` table + `ai_decision` enum (referenced, not in repo SQL). AI edge function `ai-evidence-verification` (referenced by mobile, not in `supabase/functions/`). `retry_stuck_ai_jobs()` via pg_cron. `officer_review_complaint` human override.

### C10. Departments/Officers [S]
- `departments`, `officers`, `complaint_assignments`, `assignment_audit_logs` (referenced by admin, not in repo SQL). `manual_assign_complaint` RPC. Auto-assignment [S/M].

### C11. SLA [S]
- `complaints.sla_deadline` column exists. `sla_rules` table (admin). No background SLA monitor in repo. SLA_WARNING never sent.

### C12. Safety [S]
- `safety_alerts`, `safety_incidents`, `safety_contacts`, `safety_checkins`, `safe_places`, `anonymous_reports` (referenced by mobile RPCs, not in repo SQL). `get_active_safety_alerts`, `acknowledge_safety_alert`, `resolve_safety_incident`, `get_safety_incident_location_shares` (admin RPCs).

### C13. Automation [S]
- `automation_rules`, `automation_executions`, `automation_audit_log` (referenced by admin, not in repo SQL). `automation_stats`, `automation_complaint_history`, `get_automation_*` RPCs.

### C14. Civic incidents [S]
- `civic_incidents`, `duplicate_links` (referenced by admin, not in repo SQL).

### C15. Privacy [I]
- `upsert_user_settings`, `upsert_notification_preference`, `request_account_deletion`, `cancel_account_deletion`, `clear_location_history`, `download-my-data` edge function.

---

## Module D — Express + Prisma Backend (Parallel Stack) [I but not wired to admin frontend]

- 57 REST endpoints (auth, users, departments, complaints, notifications, rewards, analytics, uploads, docs). JWT + refresh rotation. Socket.IO. Cloudinary. FCM. Prisma in `admin` schema. Vitest tests. See `19_API_DOCUMENTATION.md` §Express.
