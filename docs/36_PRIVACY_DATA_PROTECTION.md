# JanMitra — Privacy & Data Protection Document

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Note:** Do not invent legal compliance claims. This document distinguishes
> **implemented** privacy controls from **recommended** controls. No specific
> legal regime (DPDP Act, GDPR, etc.) compliance is claimed unless verifiable.

---

## 1. Personal Data Collected
| Data | Source | Storage | Implemented controls |
|------|--------|---------|---------------------|
| Name | Registration | `profiles.name` | RLS (own) |
| Email | Registration | `profiles.email` (unique) | RLS (own); one per account |
| Phone | Registration | `profiles.phone` (normalized, unique) | RLS (own); one per account |
| Aadhaar | KYC | `aadhaar_kyc` (sha256 digest + masked only) | RLS (own); never raw |
| Avatar | Profile | `avatars` public bucket | Owner-scoped |
| Location | Report/SOS | `complaints.location` (PostGIS), safety_incidents | Privacy-safe nearby projections; precision setting |
| City/Ward | Profile | `profiles.city`/`ward` | `privacy_show_ward` toggle |

## 2. Location Data
- **Collected:** complaint location (GPS), SOS live location (every 15s), safety check-in.
- **Usage:** routing, nearby queries, map, SLA, safety response.
- **Privacy controls (Implemented):**
  - Nearby queries return **no user_id**, **truncated description** (160 chars), **approximate address**.
  - Location precision setting (exact/block/ward/city) — `privacy_settings_repository`.
  - `clear_location_history` RPC — clears location data, returns count.
  - SOS location shared only with trusted contacts + responders.
- **Recommended:** location data minimization (drop precision after resolution); retention policy for SOS location trail.

## 3. Complaint Data
- **Stored:** title, description, severity, status, location, address, images, status history, assignments, AI verification, community verifications, resolution evidence.
- **Visibility:** owner sees full; admin sees full; other citizens see privacy-safe nearby projection only; no "view all complaints" RLS policy.
- **Retention:** not auto-deleted; admin bulk delete with reason.

## 4. Images
- `complaint_images` private bucket (signed URLs); `resolution_evidence` authenticated read.
- Owner-scoped storage paths.
- MIME + size limits.
- Deleted with complaint (cascade) or admin bulk delete.

## 5. Safety Data
- SOS incidents, trusted contacts, check-ins, anonymous reports.
- Trusted contacts: name + phone + relationship (max 3).
- Anonymous reports: no personal identifier.
- Location trail: `get_safety_incident_location_shares` (responders/admin only).

## 6. Emergency Data
- SOS triggers immediate location sharing to trusted contacts + responders. Necessary for the safety purpose; ceases on cancel/resolve.

## 7. Data Collection
- Minimal: only what's needed for reporting, tracking, safety, gamification. No analytics tracking SDKs in mobile. Admin analytics are computed from complaint data (no third-party tracking).

## 8. Data Usage
- Civic complaint management, municipal workflow, safety response, gamification, analytics (aggregate, no individual profiling beyond leaderboard opt-in).

## 9. Data Retention
- **Implemented:** account deletion (30-day grace + cancel), location history clearable, data download.
- **Recommended:** defined retention periods for resolved complaints, safety incidents, audit logs; auto-purge of expired device tokens.

## 10. Data Deletion
- **Implemented (Citizen):** `request_account_deletion` (30-day grace) + `cancel_account_deletion`; `clear_location_history`; `download-my-data` edge function [S]; logout all devices (`signOut(scope: others)`).
- **Implemented (Admin):** bulk delete complaints (reason); delete complaint images; soft delete officers.
- **Recommended:** hard-delete after grace period; cascade deletion verification.

## 11. Access Control
- RLS on every table (own data only for citizens; admin for privileged).
- SECURITY DEFINER RPCs for writes; service_role only for reputation.
- Admin role from `app_metadata.role` (not self-editable).
- See `20_SECURITY_SPEC.md`, `21_RBAC_MATRIX.md`.

## 12. Citizen Privacy
- Profile visibility levels (public/verified_users/officials_only/private).
- Leaderboard opt-out (`privacy_show_leaderboard`).
- Ward visibility opt-out (`privacy_show_ward`).
- Notification preferences (per-category channels).
- Aadhaar masking (never shown raw).

## 13. Sensitive Location Protection
- Nearby queries privacy-safe (no user_id, truncated, approximate).
- Location precision setting.
- Clear history.
- SOS location: responders only.

## 14. Anonymous Reporting
- `submit_anonymous_report` RPC: no `user_id` attached (stored null). Message + optional location only.

## 15. Audit Data
- `complaint_status_history`, `rewards`, `audit_logs` [S], `automation_audit_log` [S] record actions for accountability. Audit data itself is access-restricted (admin).

## 16. Recommended Controls (Not Confirmed Implemented)
- Formal data retention policy + auto-purge.
- DPDP Act / GDPR assessment (if applicable) — not claimed here.
- Data Processing Impact Assessment.
- Third-party processor review (Supabase, Mapbox, Firebase, Cloudinary).
- Encryption at rest (Supabase provides; verify).
- Right to be forgotten hard-delete verification.
