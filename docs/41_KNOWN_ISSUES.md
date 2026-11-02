# JanMitra — Known Issues Register

> **Document version:** 1.0  
> **Generated:** 2026-09-30

| Issue ID | Module | Description | Reproduction | Root cause | Impact | Severity | Workaround | Recommended fix | Status |
|----------|--------|-------------|--------------|------------|--------|----------|----------|---------------|--------|
| KI-001 | Database | officers/departments/AI/safety/automation/SLA/audit tables NOT created in version-controlled SQL | Inspect `database/*.sql` | Migrations 12–14 reference objects applied directly to live project | Repo doesn't fully represent live schema; fresh setups incomplete | Critical | Apply live schema manually or extract from live project | Version-control all live DDL | Open |
| KI-002 | Database | `complaint_status` enum has only 6 values in repo; live has ~19 | Inspect `01_schema.sql` vs mobile `complaint_status.dart` | Extended via `ALTER TYPE ADD VALUE` outside repo | Fresh setup lacks AI/community states | Critical | Apply `ALTER TYPE ADD VALUE` manually | Version-control enum extension | Open |
| KI-003 | Database | `complaints.assigned_department_id`, `ward`, `evidence_request_message` columns referenced but never ALTER'd in repo | Inspect `13`/`12` | Columns added to live project directly | Fresh setup breaks admin frontend | High | Add columns manually | Version-control ALTERs | Open |
| KI-004 | Backend (Express) | Raw SQL queries `public.complaints` + `public."ComplaintStatus"` while Prisma ORM uses `admin.*` | Inspect `geospatial.service.ts`, `analytics.service.ts` | Schema path hardcoded to public in raw SQL | Geospatial/analytics endpoints may fail or read wrong schema | Critical | Fix raw SQL to use `admin` schema OR deprecate Express backend | Decide: align schema or remove backend | Open |
| KI-005 | Backend (Express) | Express backend NOT wired to admin frontend (frontend uses Supabase directly) | Inspect admin frontend imports | Two parallel architectures | Express backend effort may be wasted | High | Document as intentional/legacy | Decide: wire or deprecate | Open |
| KI-006 | AI | `ai-evidence-verification` edge function not in `supabase/functions/` | List `supabase/functions/` | Deployed separately, not version-controlled | Can't review/audit AI logic from repo | High | Document live deployment | Bring source into repo | Open |
| KI-007 | AI | `download-my-data` edge function not in repo | Mobile `privacy_settings_repository` calls it | Deployed separately | Privacy feature not auditable from repo | Medium | Document | Bring source into repo | Open |
| KI-008 | Admin frontend | `ComplaintsPage.tsx` sets `dateTo` to `dateFrom` value | `params.set('dateTo', filters.dateFrom)` line | Typo bug | Date filter uses wrong end date | Medium | Use `filters.dateTo` | Fix to `filters.dateTo` | Open |
| KI-009 | Admin frontend | `categories.ts` both branches return `'CATEGORY_UPDATED'` | `categories.ts:79` | Dead code | No functional impact | Low | — | Remove dead branch | Open |
| KI-010 | Admin frontend | `escalateComplaint` logs `CONFIG_CHANGED` not escalation action | `complaints.ts:307` | Copy-paste | Audit action mislabeled | Low | — | Use `ESCALATION` action | Open |
| KI-011 | Admin frontend | AI hotspots stubbed (`useProdAiHotspots` returns `[]`) | `MapProvider.tsx:121` | Placeholder | Dashboard hotspot UI shows nothing | Low | — | Implement hotspots or remove UI | Open |
| KI-012 | Admin frontend | No Audit Logs page despite `view_audit_logs` permission + `logAudit` calls | Inspect routes | Page not built | No UI to view audit trail | High | Use `complaint_status_history` for status audit | Build Audit Logs page | Open |
| KI-013 | Admin frontend | No tests, no test script, no linter | Inspect `package.json` | Not set up | Regression risk | High | — | Add Vitest + ESLint + CI | Open |
| KI-014 | Admin frontend | `audit_logs` table not confirmed present; `logAudit` catches 42P01 | `services/audit.ts` | Table not in repo SQL | Privileged actions may not persist | High | Confirm on live project | Version-control table | Open |
| KI-015 | Security | `resolve_phone_login` granted to `anon` | `12_phone_login.sql` | Designed for pre-signin lookup | Caller who knows a phone can learn bound email | Medium | Documented trade-off | Restrict or rate-limit | Open |
| KI-016 | Security | No route-level admin role guard (per-feature `canXxx()` only) | `ProtectedRoute.tsx` | Only checks auth presence | All authenticated users reach all routes (server RLS still enforces) | Medium | RLS is real enforcement | Add route guards | Open |
| KI-017 | SLA | `SLA_WARNING` notification never sent | Express enum defined; no sender | No background monitor | Officers not warned pre-breach | High | Reactive dashboard only | Add cron/edge fn for warnings | Open |
| KI-018 | SLA | No SLA pause/resume for "evidence requested" states | — | Not implemented | SLA clock runs during citizen-caused delays | Medium | — | Add pause/resume | Open |
| KI-019 | Docs | README stale (mentions socket.io-client, `/users`, `/profile` routes, wrong demo accounts) | Read `ADMIN/frontend/README.md` | Out of date | Misleading | Low | — | Update README | Open |
| KI-020 | Docs | Database README demo accounts (`admin@janmitra.local`) vs LoginPage (`admin@janmitra.demo`) | Compare | Inconsistency | Confusion | Low | Use LoginPage values | Reconcile | Open |
| KI-021 | CI/CD | No CI/CD config file | Search repo | Not set up | No automated gates | High | Run `verify` manually | Add GitHub Actions | Open |
| KI-022 | Testing | No RLS automated tests | — | Not written | Security regression risk | High | Manual RLS testing | Add RLS test suite | Open |
| KI-023 | Mobile | App permissions tiles (Privacy settings) are info-only, not wired to system settings | `privacy_settings_screen.dart` | Not implemented | User can't jump to OS settings | Low | Snackbar message | Wire to app_settings | Open |
| KI-024 | Backend (Express) | `REDIS_URL` declared but unused | `config/env.ts` | No Redis client | Dead config | Low | — | Remove or implement | Open |
| KI-025 | Backend (Express) | `auditMiddleware` defined but never used | `middleware/audit.ts` | Pass-through | Dead code | Low | — | Remove | Open |
| KI-026 | Backend (Express) | `removeImage()` defined but unreachable | `complaints.service.ts` | No endpoint | Dead code | Low | — | Add endpoint or remove | Open |
| KI-027 | Backend (Express) | `ComplaintAssignment.userId` ambiguous vestigial field | Prisma schema | Redundant with `assignedById` | Confusion | Low | — | Remove | Open |
| KI-028 | Backend (Express) | `EVENTS.statsUpdated` defined never emitted | `realtime/events.ts` | — | Dashboard doesn't get pushed stats | Low | — | Emit or remove | Open |
| KI-029 | Backend (Express) | `SPEND` point type never created | Prisma enum | No redemption | Rewards spend unused | Low | — | Implement redemption or remove | Open |
| KI-030 | Realtime | `find_similar_complaints` `incident_*` columns hardcoded NULL (no `civic_incidents` table in repo) | `11_similarity_and_leaderboard.sql` header | Table [S] on live | Incident grouping data missing in fresh setup | Medium | Apply live schema | Version-control `civic_incidents` | Open |
