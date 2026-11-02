# JanMitra — Requirements Gap Analysis

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> Compares: Original requirements (prompt + documents) vs. Current implementation (repo) vs. Required production implementation.

---

## Priority Key
**Critical** (security/data/availability) · **High** (core feature missing) · **Medium** (important enhancement) · **Low** (nice-to-have).

## 1. Missing Features

| # | Feature | Priority | Status | Detail |
|---|---------|----------|--------|--------|
| G1 | Audit Logs page | High | Missing | No `/audit-logs` route; `audit_logs` table not in repo SQL; `logAudit` swallows "table not found"; `listAuditLogs` unused. |
| G2 | SLA warning notifications | High | Missing | `SLA_WARNING` type defined (Express) but never sent; no background monitor/cron. |
| G3 | Automatic officer assignment | High | Specified, not implemented | Manual assignment only; no jurisdiction/distance/workload auto-assign. |
| G4 | AI edge function source | High | Not in repo | `ai-evidence-verification` referenced by mobile, not in `supabase/functions/`. |
| G5 | `download-my-data` edge function | Medium | Not in repo | Referenced by mobile privacy settings, not in repo. |
| G6 | SMS notifications | Low | Out of scope | Push + in-app only. |
| G7 | Offline-first mobile sync | Low | Out of scope | App degrades gracefully but no sync queue. |
| G8 | Multi-city rollout | Low | Out of scope | Bhopal geofence only. |

## 2. Partial Features

| # | Feature | Priority | Status | Detail |
|---|---------|----------|--------|--------|
| P1 | SLA monitoring | High | Partial | `sla_deadline` column exists; admin UI reads `sla_rules` [S]; no proactive warnings; population logic [S] in public schema. |
| P2 | Police auto-dispatch | Medium | Partial | Admin acknowledge/resolve implemented; closest-officer/station auto-selection [S]. |
| P3 | Audit logging | Medium | Partial | Status history + rewards fully audited; general `audit_logs` [S] partial; no Audit Logs page. |
| P4 | Evidence metadata | Medium | Partial | No per-image EXIF/timestamp/caption for citizen evidence (only resolution evidence has caption). |
| P5 | Per-category notification UI | Low | Partial | `notification_preferences` RPC exists; UI for per-category toggles not prominent. |
| P6 | AI hotspots on production map | Low | Partial (stub) | `useProdAiHotspots` returns []; hotspot UI exists but no data. |

## 3. Broken Features

| # | Feature | Priority | Detail |
|---|---------|----------|--------|
| B1 | Admin ComplaintsPage dateTo bug | Medium | `dateTo` set to `dateFrom` value (`params.set('dateTo', filters.dateFrom)`) — filter wrong. |
| B2 | Express raw SQL schema mismatch | Critical | Geospatial/analytics raw SQL queries `public.complaints` + `public."ComplaintStatus"` while Prisma ORM uses `admin.*`; may fail or read wrong data. |
| B3 | categories.ts dead code | Low | `action = patch.active === false ? 'CATEGORY_UPDATED' : 'CATEGORY_UPDATED'` — both branches same. |
| B4 | escalateComplaint audit action | Low | Logs `CONFIG_CHANGED` instead of escalation-specific action. |

## 4. Inconsistent Behavior

| # | Issue | Priority | Detail |
|---|-------|----------|--------|
| I1 | Two backends | High | Express/Prisma (`admin` schema) vs Supabase-direct (public schema). Admin frontend uses Supabase directly; Express not wired. |
| I2 | complaint_status enum | High | Repo SQL: 6 values; live + apps: ~19 values. Extended enum not version-controlled. |
| I3 | Demo accounts mismatch | Low | README: `admin@janmitra.local`; LoginPage: `admin@janmitra.demo`. |
| I4 | README stale | Low | Mentions socket.io-client (actually Supabase Realtime), `/users` + `/profile` routes (don't exist). |
| I5 | Storage inconsistency | Medium | Mobile uses Supabase Storage; Express uses Cloudinary. |
| I6 | Auth inconsistency | Medium | Mobile: Supabase Auth; Express: JWT + optional Firebase. |

## 5. Security Gaps

| # | Gap | Priority | Detail |
|---|-----|----------|--------|
| S1 | `resolve_phone_login` to anon | Medium | Granted to anon — lets caller who knows a phone learn the bound email (documented trade-off). |
| S2 | No route-level admin role guard | Medium | Admin frontend per-feature `canXxx()` only; all authenticated users reach all routes (server RLS still enforces). |
| S3 | `audit_logs` not confirmed present | High | Privileged actions may not be recorded; `logAudit` silently fails. |
| S4 | Service-role key in client? | Low | No — verified service-role only in edge functions. |
| S5 | AI failure → silent reject risk | Critical | Mitigated by design (AI failure → human review, never reject) — but verify edge function implements this. |

## 6. Database Gaps

| # | Gap | Priority | Detail |
|---|-----|----------|--------|
| D1 | officers/departments/AI/safety/automation/SLA/audit tables | Critical | Referenced by apps + migrations 12–14, NOT created in version-controlled SQL. |
| D2 | complaint_status enum extended | High | 6 values in repo; ~19 live; not version-controlled. |
| D3 | `assigned_department_id`/`ward`/`evidence_request_message` columns | High | Referenced in 13/12, never ALTER'd in repo. |
| D4 | `system_config` table | Medium | Referenced by 14, not created. |
| D5 | `ai_decision` enum | Medium | Referenced, not created. |
| D6 | No SLA engine/table in public schema | High | Only `sla_deadline` column; no population logic. |

## 7. UI Gaps

| # | Gap | Priority | Detail |
|---|-----|----------|--------|
| U1 | Audit Logs page | High | No UI. |
| U2 | Per-category notification toggles | Low | Not prominent. |
| U3 | AI hotspots stubbed | Low | `useProdAiHotspots` returns []. |
| U4 | App permissions tiles | Low | Info-only, not wired to system settings (mobile). |

## 8. API Gaps

| # | Gap | Priority | Detail |
|---|-----|----------|--------|
| A1 | AI edge function not in repo | High | Deployed separately. |
| A2 | `download-my-data` edge function not in repo | Medium | Deployed separately. |
| A3 | Express ↔ admin frontend disconnected | High | Backend exists but unused by frontend. |
| A4 | No delete-complaint-image endpoint (Express) | Low | `removeImage` defined, never called. |

## 9. Testing Gaps

| # | Gap | Priority | Detail |
|---|-----|----------|--------|
| T1 | Admin frontend no tests | High | No test files, no test script, no framework. |
| T2 | No RLS automated tests | High | Critical for security. |
| T3 | No realtime tests | Medium | — |
| T4 | No AI validation tests | Medium | — |
| T5 | No coverage measurement | Medium | — |
| T6 | Mobile tests minimal | Medium | Only widget tests. |
| T7 | No accessibility tests | Medium | — |
| T8 | No CI/CD pipeline | High | No config file. |

## 10. Documentation Gaps (before this package)
| # | Gap | Priority |
|---|-----|----------|
| DOC1 | No version-controlled schema for live tables | Critical |
| DOC2 | Stale README (socket.io, demo accounts, routes) | Low |
| DOC3 | No ADRs | Medium |

## 11. Recommended Next Implementation Priorities
1. **Critical:** Version-control the live schema (D1, D2, D3) — officers, departments, AI, safety, automation, SLA, audit tables + extended enum.
2. **Critical:** Fix Express raw SQL schema mismatch (B2) or deprecate the Express backend (I1).
3. **Critical:** Verify AI edge function never silently rejects (S5); bring `ai-evidence-verification` source into repo (G4).
4. **High:** Add Audit Logs page + confirm `audit_logs` table (G1, P3).
5. **High:** Implement SLA warning notifications (background monitor) (G2, P1).
6. **High:** Implement auto-assignment (G3) or document manual-only as intentional.
7. **High:** Add admin frontend tests + CI/CD (T1, T8).
8. **High:** Add RLS automated tests (T2).
9. **Medium:** Fix ComplaintsPage dateTo bug (B1).
10. **Medium:** Resolve demo account / README inconsistencies (I3, I4).
