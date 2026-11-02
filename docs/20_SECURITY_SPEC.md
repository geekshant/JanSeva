# JanMitra — Security Architecture

> **Document version:** 1.0  
> **Generated:** 2026-09-30

---

## 1. Authentication

### 1.1 Supabase Auth (primary path — mobile + admin frontend)
- Email + password. Phone login resolved to email via `resolve_phone_login` RPC.
- Email verification **disabled** (per database README) — signup signs in directly.
- One account per email (`profiles_email_uniq`), one per phone (`profiles_phone_normalized_uniq`).
- Admin role from `app_metadata.role` (NOT `user_metadata` — app_metadata can't be self-edited).
- Password reset via deep link (`passwordRecovery` event → `/reset-password`).

### 1.2 Express JWT (parallel backend)
- JWT access (24h, HS256, issuer `janmitra`) + opaque refresh (7d, SHA-256 digest stored).
- Refresh token rotation on every use. Password change revokes all sessions.
- Firebase auth mode (`AUTH_MODE=firebase`) verifies Firebase ID tokens server-side.
- httpOnly cookies (`jm_access`, `jm_refresh`, secure in prod, sameSite lax) + Bearer header.

## 2. Authorization

### 2.1 RLS (Row Level Security)
Enabled on every table. Key policies:
- **profiles:** own SELECT/INSERT/UPDATE.
- **complaints:** own SELECT/INSERT. **No "view all"** (deliberate privacy — prevents leaking all complaints).
- **complaint_images:** own SELECT/INSERT (`is_own_complaint`).
- **complaint_status_history:** own SELECT.
- **rewards:** own SELECT. **No INSERT/UPDATE** (default deny).
- **user_badges:** own SELECT. **No INSERT** (default deny).
- **notifications:** own SELECT/UPDATE. **No INSERT** (trigger-only).
- **device_tokens:** own SELECT/INSERT/UPDATE/DELETE.
- **categories:** public SELECT where active.
- **reward_rules / level_config:** authenticated SELECT.
- **resolution_evidence:** authenticated SELECT/INSERT; admin DELETE.
- **community_verifications:** authenticated SELECT; own INSERT.
- **aadhaar_kyc:** own SELECT.
- **complaint_ai_verification** [S]: admin SELECT/UPDATE.

### 2.2 SECURITY DEFINER RPCs
Privileged writes are SECURITY DEFINER functions, granted to specific roles:
- `create_complaint` — authenticated (creates own complaint + images).
- `create_notification` — **revoked from all API roles** (trigger-only).
- `award_points` / `check_and_award_badges` / `record_volunteer_activity` — **service_role only** (revoked from anon/authenticated).
- `officer_review_complaint` — admin OR active officer.
- `manual_assign_complaint` — admin/officer.
- `reopen_complaint` / `bulk_delete_complaints` — admin.

### 2.3 Role checks
`is_admin()` (repo `02`): `lower(jwt.app_metadata.role) in ('admin','system_admin','department_admin','officer')`. No roles table — role from JWT only.

Admin frontend `canXxx()` helpers (`lib/workflow.ts`): UX-only gates (hide/disable buttons). Real enforcement is server-side (RLS + RPCs).

## 3. Reputation Protection (Anti-Cheat)
- `protect_reputation_columns()` BEFORE INSERT/UPDATE trigger on `profiles` — rejects client writes to `points`/`level` unless GUC `janmitra.allow_reputation_write='on'`.
- Only `award_points` (service_role, SECURITY DEFINER) sets that GUC.
- `rewards`/`user_badges` have no INSERT policy (default deny).
- Leaderboard is privacy-safe (`community_leaderboard` returns no user ids/emails; respects `privacy_show_leaderboard`).

## 4. Storage Security
- `complaint_images` bucket: **private** (signed URLs only); owner-scoped paths (`<uid>/...`); admin read/delete.
- `avatars` bucket: public read; owner upload/update/delete.
- MIME + size limits enforced (jpg/png/webp; 10MB complaints, 5MB avatars).

## 5. API Security
- RLS on every query.
- SECURITY DEFINER for privileged writes.
- Service-role keys only in Edge Functions (never in client).
- Express: Helmet headers, CORS allowlist, rate limiting (global 300/window, auth 20/window), request ID, redacted logging, Zod validation.

## 6. Admin Permissions
- SYSTEM_ADMIN: full control (all actions, suspend/restore, bulk delete, all departments).
- DEPARTMENT_ADMIN: scoped to own department; can't touch SYSTEM_ADMIN users; can't promote to SYSTEM_ADMIN.
- OFFICER: limited transitions; can verify/reject/request-evidence; acknowledge/in-progress.
- Citizen: own complaints only; can't change status; can verify own resolved complaint.

## 7. Officer Permissions
- Active officers (`officers.active=true`) can review complaints (`officer_review_complaint`).
- Officers receive assignments; can update status within allowed transitions.

## 8. Citizen Permissions
- Register, login, file complaints, add evidence (own), delete (pre-verification, own), track, verify resolutions nearby, safety features, gamification (read-only), profile (whitelisted), privacy.

## 9. Sensitive Information
- **Aadhaar:** stored as `sha256(digits)` digest + masked `XXXX XXXX 1234` only. Never raw. One per auth user.
- **Location:** nearby queries return privacy-safe projections (no user_id, truncated description, approximate address). Citizen can set precision (exact/block/ward/city).
- **SOS location:** shared only with trusted contacts + responders; not exposed unnecessarily.
- **Phone:** normalized 10-digit; masked in some views.
- **Email:** one per account; not exposed in leaderboard.

## 10. Service-Role Key Protection
- Used only in `send-push-notifications` edge function (and `ai-evidence-verification` [S]).
- Never bundled in client apps.
- `award_points` granted to service_role only.

## 11. Environment Variables & Secrets
- Mobile: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable), `MAPBOX_ACCESS_TOKEN`, `FIREBASE_*` (public client config). `.env` bundled as asset.
- Admin frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAPBOX_ACCESS_TOKEN`.
- Express: `DATABASE_URL`, `JWT_SECRET` (≥32 chars prod), `FIREBASE_SERVICE_ACCOUNT`, `CLOUDINARY_*`, `CORS_ORIGINS`.
- Edge function: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_SERVICE_ACCOUNT`.
- **Never expose** service-role keys, JWT secrets, Firebase service accounts, or Cloudinary secrets to clients.

## 12. File Upload Security
- Type + size validation (client + storage bucket config).
- Owner-scoped storage paths.
- Private bucket signed URLs (3600s expiry).
- Express: Cloudinary signed uploads (server-side signature).

## 13. Input Validation
- Mobile: client-side (phone, password, Aadhaar, title length, photo count/size).
- Admin frontend: Zod schemas (Express), client-side forms.
- DB: CHECK constraints (title length, severity enum, status enum, level >= 1, aadhaar name length, phone platform).

## 14. SQL Injection Prevention
- Supabase: parameterized PostgREST RPCs (no raw SQL from clients).
- Express: Prisma parameterized queries. **Raw SQL** in geospatial/analytics uses `$queryRaw` with tagged templates (parameterized) — but references `public.complaints` (schema mismatch, see `40_GAP_ANALYSIS.md`).

## 15. XSS / CSRF
- React/Flutter escape by default. Admin uses Helmet CSP (disabled in non-prod).
- Express: httpOnly + sameSite lax cookies mitigate CSRF; Bearer header alternative.

## 16. Rate Limiting
- Express: global 300/window, auth 20/window.
- Supabase: platform-level (not app-configured).

## 17. Abuse Prevention
- Reputation protected (can't self-award).
- Idempotency keys prevent duplicate complaints.
- One verification per citizen per complaint.
- Max 3 trusted contacts.
- Min 3 photos per complaint.
- Bhopal geofence.
- Community verification can reopen false resolutions.
- Admin can suspend citizens.

## 18. Audit Logs
- `complaint_status_history` (trigger) — every status change.
- `rewards` (append-only) — every point change.
- `audit_logs` [S] — privileged actions (`officer_review_complaint`).
- `assignment_audit_logs` [S] — assignment changes.
- `automation_audit_log` [S] — automation executions.

## 19. Session Management
- Supabase: persisted session, auto-refresh, detectSessionInUrl.
- Express: refresh token rotation, revocation on password change, httpOnly cookies.

## 20. Token Security
- Supabase JWT (RS256, platform-managed).
- Express JWT (HS256, `JWT_SECRET` ≥32 chars prod), `jti`, issuer claim, access/refresh separation, opaque refresh stored as digest.

## 21. Data Retention
- Account deletion: 30-day grace + cancel (`request_account_deletion`/`cancel_account_deletion`).
- Location history: clearable (`clear_location_history`).
- Data download: `download-my-data` edge function [S].
- Complaints: not auto-deleted (admin bulk delete with reason).
- Soft delete: Express `deleted_at` on users/officers; complaints deleted via RPC.

## 22. Security Concerns (see `41_KNOWN_ISSUES.md`, `40_GAP_ANALYSIS.md`)
- `resolve_phone_login` granted to `anon` — lets a caller who knows a mobile number learn the bound email (documented trade-off).
- Admin frontend has no route-level role guard (per-feature only).
- `audit_logs` table not confirmed present; `logAudit` swallows "table not found".
- AI edge function not in repo (deployed separately).
- Express raw SQL schema mismatch (`public` vs `admin`).
