# JanMitra — Role & Permission Matrix (RBAC)

> **Document version:** 1.0  
> **Generated:** 2026-09-30

> Roles: **Citizen** (Supabase authenticated), **Officer** (app_metadata.role=OFFICER/OFFICIAL), **Department Admin** (DEPARTMENT_ADMIN), **Municipal Admin** (SYSTEM_ADMIN), **Police/Safety Responder** (OFFICER on safety page), **AI/System** (service_role/edge function), **Anonymous** (anon).
> ✅ = allowed, ❌ = denied, 🔒 = own data only, 🅰 = admin (any dept for SYSTEM_ADMIN; own dept for DEPARTMENT_ADMIN), [S] = specified/not confirmed.

| Action | Citizen | Officer | Dept Admin | Munic. Admin | Police | AI/System | Anonymous |
|--------|--------|---------|------------|--------------|--------|-----------|-----------|
| **View** | | | | | | | |
| View own profile | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| View own complaints | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| View all complaints | ❌ | 🅰 | 🅰 | ✅ | ❌ | ✅ (service) | ❌ |
| View complaint details | 🔒 | 🅰 | 🅰 | ✅ | ❌ | ✅ | ❌ (tracking code only in Express) |
| View complaint evidence | 🔒 | 🅰 | 🅰 | ✅ | ❌ | ✅ | ❌ |
| View citizen contact info | ❌ | 🅰 | 🅰 | ✅ | safety-only | — | ❌ |
| View location | 🔒 | 🅰 | 🅰 | ✅ | safety-only | nearby (privacy-safe) | ❌ |
| View leaderboard | ✅ | ✅ | ✅ | ✅ | — | — | ❌ |
| View analytics | ❌ | ❌ | 🅰 | ✅ | — | — | ❌ |
| View audit logs | ❌ | ❌ | 🅰 | ✅ | — | — | ❌ |
| View safety alerts | ❌ | ❌ | ❌ | ✅ | ✅ | — | ❌ |
| View automation | ❌ | ❌ | 🅰 | ✅ | — | — | ❌ |
| **Create** | | | | | | | |
| Register account | ✅ | — | — | — | — | — | ❌ |
| Create complaint | ✅ | — | — | — | — | — | ❌ (Express: anonymous flag) |
| Add evidence (own) | ✅ | — | — | — | — | — | ❌ |
| Upload resolution evidence | ❌ | ✅ | ✅ | ✅ | — | — | ❌ |
| Submit community verification | ✅ | — | — | — | — | — | ❌ |
| Trigger SOS | ✅ | — | — | — | — | — | ❌ |
| Anonymous report | ✅ | — | — | — | — | — | ❌ |
| Register device token | ✅ | ✅ | ✅ | ✅ | ✅ | — | ❌ |
| Create department | ❌ | ❌ | ❌ | ✅ | — | — | ❌ |
| Create officer | ❌ | ❌ | ❌ | ✅ | — | — | ❌ |
| Create category | ❌ | ❌ | ❌ | ✅ | — | — | ❌ |
| Create SLA rule | ❌ | ❌ | ❌ | ✅ | — | — | ❌ |
| Create badge/reward rule | ❌ | ❌ | ❌ | ✅ | — | — | ❌ |
| Create civic incident | ❌ | ❌ | 🅰 | ✅ | — | — | ❌ |
| Create automation rule | ❌ | ❌ | ❌ | ✅ | — | — | ❌ |
| **Update** | | | | | | | |
| Update own profile (whitelisted) | ✅ | ✅ | ✅ | ✅ | ✅ | — | ❌ |
| Update points/level | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (service) | ❌ |
| Change complaint status | ❌ | 🅰 | 🅰 | ✅ | — | ✅ (AI) | ❌ |
| Verify/reject/request-evidence | ❌ | ✅ | ✅ | ✅ | — | — | ❌ |
| Assign complaint | ❌ | ✅ | 🅰 | ✅ | — | ✅ (auto [S]) | ❌ |
| Escalate complaint | ❌ | ❌ | 🅰 | ✅ | — | — | ❌ |
| Reopen complaint | ✅ (community) | ❌ | 🅰 | ✅ | — | — | ❌ |
| Close complaint | ❌ | ❌ | 🅰 | ✅ | — | — | ❌ |
| Update AI config | ❌ | ❌ | ❌ | ✅ | — | — | ❌ |
| Update notification config | ❌ | ❌ | ❌ | ✅ | — | — | ❌ |
| Acknowledge safety alert | ❌ | ❌ | ❌ | ✅ | ✅ | — | ❌ |
| Resolve safety incident | ❌ | ❌ | ❌ | ✅ | ✅ | — | ❌ |
| Update automation rule | ❌ | ❌ | ❌ | ✅ | — | — | ❌ |
| Mark notification read | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | — | ❌ |
| **Delete** | | | | | | | |
| Delete own complaint (pre-verify) | ✅ | ❌ | ❌ | ✅ (bulk) | — | — | ❌ |
| Delete complaint images | 🔒 | 🅰 | 🅰 | ✅ | — | — | ❌ |
| Delete department | ❌ | ❌ | ❌ | ✅ (if not in use) | — | — | ❌ |
| Delete officer (soft) | ❌ | ❌ | ❌ | ✅ | — | — | ❌ |
| Delete SLA rule | ❌ | ❌ | ❌ | ✅ | — | — | ❌ |
| Bulk delete complaints | ❌ | ❌ | ❌ | ✅ | — | — | ❌ |
| Delete account (30-day) | ✅ | ❌ | ❌ | ❌ | — | — | ❌ |
| **Verify/Manage** | | | | | | | |
| Verify resolution (own) | ✅ | — | — | ✅ | — | — | ❌ |
| Manage departments | ❌ | ❌ | 🅰 | ✅ | — | — | ❌ |
| Manage officers | ❌ | ❌ | 🅰 | ✅ | — | — | ❌ |
| Manage SLA | ❌ | ❌ | 🅰 | ✅ | — | — | ❌ |
| Manage automation | ❌ | ❌ | ❌ | ✅ | — | — | ❌ |
| Manage gamification config | ❌ | ❌ | ❌ | ✅ | — | — | ❌ |
| Manage safety alerts | ❌ | ❌ | ❌ | ✅ | ✅ | — | ❌ |
| Suspend/restore citizen | ❌ | ❌ | ❌ | ✅ | — | — | ❌ |
| View analytics | ❌ | ❌ | 🅰 | ✅ | — | — | ❌ |

## Permission Source of Truth
- **Server-side:** RLS policies + SECURITY DEFINER RPCs + `is_admin()` + role in JWT `app_metadata.role`. This is the real enforcement.
- **Client-side (UX only):** Admin frontend `canXxx()` helpers in `lib/workflow.ts` (`canAssign`, `canEscalate`, `canSuspendCitizen`, etc.) + `getAllowedTransitions(status, role)`.
- **Express backend:** `requireAuth`, `requireRole`, `requireAdmin`, `requireOfficial` middleware + transition matrix in `status.rules.ts`.

## Notes
- Department Admin is **scoped to own department**: can't touch other depts, can't promote to SYSTEM_ADMIN, can't touch SYSTEM_ADMIN users, can't change own role.
- Officer review (`officer_review_complaint`) allows admin OR active `officers` row.
- AI/System role is `service_role` (edge functions + `award_points`); not a user role.
- Anonymous can only submit anonymous reports (authenticated, no identity attached) and public tracking lookup (Express only).
