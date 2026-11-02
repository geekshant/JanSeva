# JanMitra — API Documentation

> **Document version:** 1.0  
> **Generated:** 2026-09-30

> **Two API surfaces exist:**
> 1. **Supabase PostgREST RPCs** (primary) — called directly by the mobile app and admin frontend via the anon/publishable key.
> 2. **Express REST API** (`/api/v1`, `ADMIN/backend/`) — 57 endpoints, JWT auth, Prisma in `admin` schema. **Not wired to the admin frontend.**
>
> This document covers both, clearly separated.

---

# Part 1 — Supabase RPCs (Primary)

All RPCs are Postgres functions exposed via PostgREST. Auth: Supabase JWT (anon
key + user session). Authorization: RLS + SECURITY DEFINER + `is_admin()`/role
checks. Invoked via `supabase_client.rpc(name, args)`.

## 1.1 Authentication & Identity

| RPC | Params | Returns | Auth | Purpose |
|-----|--------|---------|------|---------|
| `resolve_phone_login` | `{ p_phone text }` | text (email) | anon+authenticated | Map 10-digit phone → account email for sign-in |
| `submit_aadhaar_registration` | `{ p_aadhaar text, p_full_name text }` | aadhaar_kyc row | authenticated | Validate+hash+store Aadhaar; status verified |

## 1.2 Complaints

| RPC | Params | Returns | Auth | Purpose |
|-----|--------|---------|------|---------|
| `create_complaint` | `{ p_category_id, p_title, p_description, p_severity, p_latitude, p_longitude, p_address, p_image_urls text[], p_image_paths text[], p_idempotency_key }` | complaints row | authenticated | Create complaint + images atomically (idempotent) |
| `join_similar_complaint` | `{ p_match_complaint_id, p_category_id, p_title, p_description, p_severity, p_lat, p_lng, p_address, p_image_urls text[], p_image_paths text[], p_idempotency_key }` | complaints row | authenticated | File new complaint linked to a match |
| `add_evidence_to_complaint` | `{ p_complaint_id, p_image_urls text[], p_image_paths text[] }` | complaints row | authenticated | Append images (ownership enforced) |
| `nearby_complaints` | `{ p_latitude, p_longitude, p_radius_meters int default 1000, p_limit int default 100 }` | table (privacy-safe) | authenticated | PostGIS ST_DWithin nearby |
| `nearby_complaints_heatmap` | `{ p_latitude, p_longitude, p_radius_meters, p_grid_size_meters, p_category_ids, p_statuses }` | grid points | authenticated | Heatmap density |
| `find_similar_complaints` | `{ p_lat, p_lng, p_category_id, p_title, p_radius_m int default 250, p_limit int default 8 }` | table | authenticated | pg_trgm + PostGIS duplicate detection |

## 1.3 Gamification

| RPC | Params | Returns | Auth | Purpose |
|-----|--------|---------|------|---------|
| `get_reputation_summary` | — | jsonb | authenticated | points/level/progress/badge_count |
| `community_leaderboard` | `{ p_limit int default 50 }` | table (rank,name,points,level,is_me) | authenticated | Privacy-safe leaderboard |
| `award_points` | `{ p_user_id, p_activity_type, p_complaint_id, p_note }` | uuid | **service_role only** | Award points (idempotent) |
| `record_volunteer_activity` | `{ p_user_id, p_note }` | uuid | **service_role only** | Volunteer +75 |
| `check_and_award_badges` | `{ p_user_id }` | void | **service_role only** | Evaluate badge criteria |

## 1.4 Community Verification

| RPC | Params | Returns | Auth | Purpose |
|-----|--------|---------|------|---------|
| `verifiable_complaints` | `{ p_latitude, p_longitude, p_radius_meters default 2000, p_limit default 50 }` | table | authenticated | List RESOLVED+pending for verification |
| `submit_community_verification` | `{ p_complaint_id, p_verified, p_comment, p_image_urls, p_image_paths }` | jsonb | authenticated | Submit confirm/dispute (one per citizen) |

## 1.5 Community Stats

| RPC | Params | Returns | Auth | Purpose |
|-----|--------|---------|------|---------|
| `community_complaint_stats` | — | jsonb (with_location, resolved, in_progress, pending) | authenticated | Home community snapshot |

## 1.6 Safety (all via RPCs, tables [S] on live project)

| RPC | Params | Returns | Auth | Purpose |
|-----|--------|---------|------|---------|
| `trigger_sos` | `{ p_latitude, p_longitude, p_address, p_message }` | safety_incident | authenticated | Start SOS |
| `cancel_sos` | `{ p_incident_id }` | — | authenticated | Cancel SOS |
| `share_location` | `{ p_incident_id, p_latitude, p_longitude, p_accuracy_meters, p_speed_mps, p_heading_deg }` | — | authenticated | Live location ping (every 15s) |
| `create_safety_checkin` | `{ p_interval_minutes }` | safety_checkin | authenticated | Start check-in timer |
| `complete_safety_checkin` | `{ p_checkin_id }` | — | authenticated | Complete check-in |
| `find_nearby_safety_places` | `{ p_latitude, p_longitude, p_radius_m, p_limit }` | table | authenticated | Nearby safe places |
| `submit_anonymous_report` | `{ p_latitude, p_longitude, p_address, p_message }` | — | authenticated | Anonymous report |
| `fetch_safety_contacts` | — | table | authenticated | List trusted contacts |
| `add_safety_contact` | `{ p_name, p_phone, p_relationship }` | — | authenticated | Add contact (max 3) |
| `update_safety_contact` | `{ p_contact_id, p_name, p_phone, p_relationship }` | — | authenticated | Update contact |
| `delete_safety_contact` | `{ p_contact_id }` | — | authenticated | Delete contact |

## 1.7 Privacy & Settings

| RPC | Params | Returns | Auth | Purpose |
|-----|--------|---------|------|---------|
| `upsert_user_settings` | `{ p_font_scale, p_high_contrast, p_reduce_motion, p_screen_reader_hints, p_larger_touch_targets, p_dnd_start, p_dnd_end, p_mute_all_notifications }` | — | authenticated | Accessibility + DND |
| `upsert_notification_preference` | `{ p_category, p_push, p_email, p_sms, p_in_app }` | — | authenticated | Per-category prefs |
| `request_account_deletion` | — | — | authenticated | Start 30-day deletion |
| `cancel_account_deletion` | — | — | authenticated | Cancel deletion |
| `clear_location_history` | — | int (count) | authenticated | Clear location data |

## 1.8 Admin RPCs (called by admin frontend, role-checked)

| RPC | Params | Returns | Purpose |
|-----|--------|---------|---------|
| `get_dashboard_complaints` | `{ p_status, p_severity, p_category_id, p_department_id, p_ward, p_date_from, p_date_to, p_limit default 500 }` | SETOF json | Dashboard complaints + AI fields |
| `get_complaints_for_ai_review` | — | table (limit 200) | AI review queue |
| `get_ai_review_queue_count` | — | int | Sidebar badge |
| `get_ai_verification` | `{ p_complaint_id }` | json | Single AI analysis |
| `officer_review_complaint` | `{ p_complaint_id, p_decision, p_reason, p_evidence_message, p_reason_type }` | complaints row | Human override (verify/reject/evidence) |
| `update_category_ai_config` | per-category fields | — | AI config update |
| `manual_assign_complaint` | `{ p_complaint_id, p_department_id, p_officer_id, p_note }` | — | Assign to dept+officer |
| `reopen_complaint` | `{ p_complaint_id, p_reason, p_reason_type }` | — | Reopen |
| `get_reopened_complaints` | — | table (limit 200) | Reopened list |
| `get_reopened_complaints_count` | — | int | Badge |
| `bulk_delete_complaints` | `{ p_complaint_ids uuid[], p_reason }` | — | Bulk delete (SYSTEM_ADMIN) |
| `list_citizens` | `{ p_search, p_suspended_only, p_page, p_limit }` | table | Paginated citizen list |
| `count_citizens` | — | int | Citizen count |
| `get_citizen_stats` | `{ p_citizen_id }` | json | Per-citizen stats |
| `get_leaderboard` | `{ p_scope, p_ward }` | table | Admin leaderboard |
| `get_active_safety_alerts` | — | table | Safety alerts |
| `get_active_safety_alerts_count` | — | int | Badge/buzzer |
| `acknowledge_safety_alert` | `{ p_alert_id }` | — | Acknowledge |
| `resolve_safety_incident` | `{ p_incident_id }` | — | Resolve |
| `get_safety_incident_location_shares` | `{ p_incident_id }` | table | Location trail |
| `automation_stats` | — | jsonb | Engine stats |
| `automation_complaint_history` | `{ p_complaint_id }` | table | Per-complaint automation log |
| `get_automation_execution_log` | `{ p_status, p_rule_id, ... }` | table | Execution log |
| `get_automation_rules_with_stats` | — | table | Rules + per-rule stats |
| `get_failed_automations` | — | table | Failed executions |
| `retry_automation_execution` | `{ p_execution_id }` | — | Retry failed |
| `get_analytics_summary` | — | jsonb | Summary KPIs + SLA |
| `get_hot_zones` | — | table | PostGIS hot zones |
| `get_department_analytics` | — | table | Per-department performance |
| `get_ward_analytics` | — | table | Per-ward stats |
| `get_ai_analytics` | — | jsonb | AI stats |
| `get_map_complaints` | viewport bounds | table | Map complaints (PostGIS) |
| `get_map_complaints_count` | viewport bounds | int | Map count |
| `find_nearby_complaints` | `{ lat, lng, radius }` | table | Incident linking (graceful failure) |
| `is_demo_mode` | — | bool | Demo mode check |
| `toggle_demo_mode` | — | — | Toggle demo |
| `seed_demo_complaints` | — | — | Seed 15 Bhopal complaints |
| `advance_demo_complaints` | — | — | Advance workflow step |
| `retry_stuck_ai_jobs` | — | table | Retry stuck AI (pg_cron) |
| `get_ai_processing_stats` | — | jsonb | AI processing stats |

## 1.9 Edge Functions

| Function | Method | Auth | Body | Purpose |
|----------|--------|------|------|---------|
| `send-push-notifications` | POST/GET | service_role (verify_jwt) | none | Drain FCM outbox |
| `ai-evidence-verification` [S] | POST | (configured) | `{ complaintId }` | AI image/category validation (not in repo) |
| `download-my-data` [S] | POST | user JWT | `{ format: 'json' }` | Export citizen data (not in repo) |

## 1.10 Storage

| Bucket | Operation | Auth | Purpose |
|--------|-----------|------|---------|
| `complaint_images` (private) | upload/read/delete | owner; read/delete admin | Evidence photos (signed URLs) |
| `avatars` (public) | upload/update/delete/read | owner; read anyone | Profile photos |

---

# Part 2 — Express REST API (Parallel, `ADMIN/backend/`)

> **Base path:** `/api/v1`. **Auth:** Bearer JWT or `jm_access` httpOnly cookie.
> **Response envelope:** `{ success, data, message?, meta? }` / `{ success:false, error:{code,message,details?} }`.
> **This API is NOT called by the admin frontend** (which uses Supabase directly). Documented for completeness.

## 2.1 Auth (`/auth`, rate-limited 20/window)
| Method | Path | Body | Purpose |
|--------|------|------|---------|
| POST | /auth/register | `{ name, email, phone?, password }` | Create citizen (role forced CITIZEN) |
| POST | /auth/login | `{ email, password }` | Login → JWT + refresh cookie |
| POST | /auth/login/firebase | `{ idToken }` | Firebase login |
| POST | /auth/refresh | cookie/body refreshToken | Rotate refresh token |
| POST | /auth/logout | cookie | Revoke session |
| GET | /auth/me | — | Current user + badges |
| PATCH | /auth/me | `{ name?, phone?, avatarUrl? }` | Update profile |
| POST | /auth/change-password | `{ currentPassword, newPassword }` | Change password (revokes all sessions) |

## 2.2 Users (`/users`, admin only)
| GET | /users | query: page,limit,role,search,departmentId,isActive | List (dept admin scoped) |
| GET | /users/:id | — | Get user |
| POST | /users | `{ name,email,phone?,password,role,departmentId? }` | Create user |
| PATCH | /users/:id | partial | Update (dept admin restricted) |
| DELETE | /users/:id | — | Soft delete |

## 2.3 Departments (`/departments`)
| GET | /departments | query: includeStats | List with counts |
| GET | /departments/overview | — | Per-dept counts (official) |
| GET | /departments/:id | — | Detail + members |
| GET | /departments/:id/complaints | query: status,priority | Dept complaints |
| POST | /departments | `{ name,code,description?,categoryMapping? }` | Create (admin) |
| PATCH | /departments/:id | partial | Update (admin) |
| DELETE | /departments/:id | — | Deactivate (refuse if in use) |

## 2.4 Complaints (`/complaints`)
| GET | /complaints/tracking/:code | — | Public tracking lookup |
| GET | /complaints/nearby | query: latitude,longitude,radiusKm,limit,status,category | PostGIS nearby (**raw SQL public.complaints**) |
| GET | /complaints/map | query: bounds, status, category, gridSize | Viewport complaints |
| GET | /complaints/clusters | same | Grid clusters |
| GET | /complaints | query: many filters + sort | List with slaState (auth) |
| GET | /complaints/me | same | Own complaints |
| GET | /complaints/sla-breaches | — | SLA breaches (admin) |
| POST | /complaints | `{ title,description,category,suggestedPriority?,latitude,longitude,address,ward?,isAnonymous?,imageUrls? }` | Create (tracking code, SLA, history, notify, points) |
| GET | /complaints/:id | — | Full detail |
| PATCH | /complaints/:id | partial | Update (official; refuses if VERIFIED) |
| PATCH | /complaints/:id/status | `{ toStatus, note?, rejectedReason?, duplicateOfId?, resolutionNote?, resolutionProofUrls? }` | Status transition (validated) |
| PATCH | /complaints/:id/assign | `{ departmentId, officerId?, note? }` | Assign (official) |
| GET | /complaints/:id/comments | — | Comments (internal filtered) |
| POST | /complaints/:id/comments | `{ text, visibility? }` | Add comment (HELPFUL_COMMENT pts if public+citizen) |
| POST | /complaints/:id/verify | `{ result, notes?, proofUrls? }` | Verify/reject resolved (author/admin) |
| POST | /complaints/:id/reopen | `{ note? }` | Reopen (author/admin) |
| POST | /complaints/:id/images | `{ urls[] }` | Attach images (max 5) |

## 2.5 Notifications (`/notifications`, auth)
| GET | /notifications | query: page,limit,unreadOnly | List |
| PATCH | /notifications/read-all | — | Mark all read |
| PATCH | /notifications/:id/read | — | Mark one read |
| POST | /notifications/devices | `{ token, platform? }` | Register FCM token |
| DELETE | /notifications/devices/:token | — | Unregister |

## 2.6 Rewards (`/rewards`, auth)
| GET | /rewards/me | — | Points + 50 transactions + badges |
| GET | /rewards/leaderboard | query: limit (max 100) | Top citizens |
| GET | /rewards/transactions | query: page,limit | Points history |
| GET | /rewards/badges | — | Badge catalog |

## 2.7 Analytics (`/analytics`, admin)
| GET | /analytics/summary | — | KPIs + SLA (**raw SQL public.complaints**) |
| GET | /analytics/categories | — | Count per category |
| GET | /analytics/statuses | — | Count per status |
| GET | /analytics/priorities | — | Count per priority |
| GET | /analytics/departments | — | Count per dept |
| GET | /analytics/trends | query: days (default 30) | Daily series (**raw SQL**) |
| GET | /analytics/hot-zones | — | Top 25 hotspots (**raw SQL**) |
| GET | /analytics/ | query: days | Full bundle |

## 2.8 Uploads (`/uploads`, auth)
| GET | /uploads/presign | query: resourceType | Cloudinary signed params |
| POST | /uploads/confirm | `{ complaintId, publicId, url? }` | Confirm upload |

## 2.9 Health & Docs
| GET | /health | — | Health check |
| GET | /api/v1/docs | — | Endpoint catalog |

## 2.10 Realtime (Socket.IO)
Rooms: `user:<id>`, `dept:<id>`, `admin`. Events: complaint:created/updated/status-changed/comment-added/assigned/verified, notification:new, dashboard:stats-updated (defined, never emitted).

## 2.11 Rate Limits
- Global: 300 req/window (RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX_REQUESTS).
- Auth: 20 req/window (RATE_LIMIT_AUTH_MAX).

## 2.12 Error Codes
`VALIDATION_ERROR`, `EMAIL_EXISTS`, `INVALID_CREDENTIALS`, `REFRESH_TOKEN_REQUIRED`, `INVALID_REFRESH_TOKEN`, `NOT_FOUND`, `SELF_DELETE`, `SELF_ROLE_CHANGE`, `DEPT_CODE_EXISTS`, `DEPARTMENT_IN_USE`, `TRACKING_EXHAUSTED`, `COMPLAINT_LOCKED`, `INVALID_STATUS_TRANSITION`, `DUPLICATE_TARGET_REQUIRED`, `NOT_RESOLVED`, `IMAGE_LIMIT`, `UPLOADS_NOT_CONFIGURED`.
