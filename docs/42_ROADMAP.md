# JanMitra — Project Roadmap

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> Based on gaps in `40_GAP_ANALYSIS.md` and `41_KNOWN_ISSUES.md`.

---

## Phase 0 — Foundation (Complete)
- ✅ Supabase project setup (public schema core: profiles, categories, complaints, images, status history, rewards, badges, notifications, device_tokens).
- ✅ Reputation engine (reward_rules, level_config, award_points, badges).
- ✅ Community verification + resolution evidence.
- ✅ Duplicate/similarity detection (pg_trgm + PostGIS).
- ✅ Phone login + Aadhaar KYC + unique contacts.
- ✅ Profile preferences/privacy.
- ✅ Push notification edge function.
- ✅ Flutter mobile app (all citizen features).
- ✅ React admin dashboard (all admin pages).
- ✅ Express backend (parallel, 57 endpoints).

## Phase 1 — Core MVP (Complete)
- ✅ Citizen registration/login/report/track.
- ✅ Admin login/dashboard/complaints/status/assign.
- ✅ Gamification (points/badges/levels/leaderboard).
- ✅ Notifications (in-app + push).
- ✅ Map (nearby/markers/heatmap).
- ✅ Safety (SOS/contacts/check-in/safe places/anonymous).

## Phase 2 — Verification & Municipal Workflow (Mostly Complete; gaps)
- ⚠️ **GAP:** Version-control live schema (officers, departments, AI tables, safety, automation, SLA rules, audit, civic_incidents, duplicate_links, complaint_assignments, category_ai_config, user_settings, notification_preferences, notification_config). **Priority: Critical.**
- ⚠️ **GAP:** Extend `complaint_status` enum version-control (6 → ~19 values). **Critical.**
- ⚠️ **GAP:** Version-control `complaints.assigned_department_id`/`ward`/`evidence_request_message` columns. **High.**
- ✅ AI review queue + human override (`officer_review_complaint`).
- ✅ Community verification (verify resolutions).
- ✅ Reopen cases.
- ✅ Civic incidents (duplicate grouping) [S].
- ⚠️ **GAP:** SLA management (rules/breaches/escalations) — partial (no proactive warnings). **High.**
- ✅ Departments + officers CRUD [S].
- ✅ Citizens list + suspend/restore.

## Phase 3 — AI, Automation, Safety, Analytics (Mostly Complete; gaps)
- ✅ AI per-category config + analytics [S].
- ✅ Automation center + rules + execution log + retry [S].
- ✅ Safety alerts admin page + buzzer.
- ✅ Full analytics suite.
- ✅ Heatmap + hot zones (hotspots stubbed on production map).
- ⚠️ **GAP:** Bring `ai-evidence-verification` edge function source into repo. **High.**
- ⚠️ **GAP:** Bring `download-my-data` edge function source into repo. **Medium.**
- ⚠️ **GAP:** Implement AI hotspots on production map (currently `[]`). **Low.**
- ⚠️ **GAP:** Verify AI failure never silently rejects (audit edge function). **Critical.**
- ⚠️ **GAP:** Implement `retry_stuck_ai_jobs` pg_cron schedule (documented, needs running). **Medium.**

## Phase 4 — Safety & Police Response (Partial)
- ✅ SOS + live location + trusted contacts + check-in + safe places + anonymous report (mobile).
- ✅ Admin safety alerts (acknowledge/resolve/buzzer).
- ⚠️ **GAP:** Closest-police-officer/station auto-dispatch. **Medium.**
- ⚠️ **GAP:** Police station/officer management UI. **Medium.**

## Phase 5 — Analytics & Optimization (Complete)
- ✅ Analytics overview + sub-pages + civic health.
- ⚠️ **GAP:** Hot zones on production map. **Low.**

## Phase 6 — Production Hardening (In Progress)
- ⚠️ **GAP:** Audit Logs page + confirm `audit_logs` table. **High.**
- ⚠️ **GAP:** SLA warning notifications (background monitor). **High.**
- ⚠️ **GAP:** Admin frontend tests + linter + CI/CD. **High.**
- ⚠️ **GAP:** RLS automated tests. **High.**
- ⚠️ **GAP:** Realtime/AI/notification/accessibility tests. **Medium.**
- ⚠️ **GAP:** Coverage measurement. **Medium.**
- ⚠️ **GAP:** Fix ComplaintsPage dateTo bug (KI-008). **Medium.**
- ⚠️ **GAP:** Fix Express raw SQL schema mismatch (KI-004) or deprecate. **Critical.**
- ⚠️ **GAP:** Decide Express backend fate (wire or deprecate, KI-005). **High.**
- ⚠️ **GAP:** Security review of `resolve_phone_login` anon grant (KI-015). **Medium.**
- ⚠️ **GAP:** Add route-level admin role guards (KI-016). **Medium.**
- ⚠️ **GAP:** Update stale README (KI-019, KI-020). **Low.**
- ⚠️ **GAP:** SLA pause/resume for evidence-requested states (KI-018). **Medium.**
- ⚠️ **GAP:** Per-image evidence metadata (EXIF/timestamp/caption). **Medium.**

## Phase 7 — Scale (Future)
- ⚠️ **GAP:** Automatic officer assignment (jurisdiction/distance/workload). **High.**
- ⚠️ **GAP:** Offline-first mobile sync. **Low.**
- ⚠️ **GAP:** SMS gateway. **Low.**
- ⚠️ **GAP:** Multi-city rollout (remove Bhopal geofence hardcode; multi-tenant). **Low.**
- ⚠️ **GAP:** Supabase branching for staging. **Medium.**
- ⚠️ **GAP:** Performance/load testing at scale. **Medium.**
- ⚠️ **GAP:** Monitoring + alerting (Sentry/Datadog). **Medium.**
- ⚠️ **GAP:** Localization beyond en/hi. **Low.**
- ⚠️ **GAP:** Reward redemption (SPEND points). **Low.**

---

## Recommended Execution Order
1. **Phase 6 (Critical):** Version-control live schema + fix Express schema mismatch + verify AI edge function safety.
2. **Phase 6 (High):** Audit Logs page, SLA warnings, admin tests + CI/CD, RLS tests, decide Express fate.
3. **Phase 4:** Police auto-dispatch + management.
4. **Phase 7 (High):** Automatic officer assignment.
5. Remaining Phase 6 medium/low + Phase 5/7 enhancements.
