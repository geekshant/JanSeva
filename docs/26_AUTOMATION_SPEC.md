# JanMitra — Automation Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Implementation status:** The admin frontend has a full **Automation Center** and
> **Automation Rules** page reading `automation_rules`, `automation_executions`,
> `automation_audit_log` tables [S] (referenced, not in version-controlled SQL).
> The Express backend has **NO automation engine** (no cron/queue; `REDIS_URL`
> declared but unused). The only scheduled automation in the repo is the
> `retry_stuck_ai_jobs()` pg_cron job (database layer). This document describes the
> **admin-facing automation** as implemented in the frontend + the **specified**
> engine.

---

## 1. Automation Center (`/automation`)
**Purpose:** Monitor the automation engine.
**Data:** `automation_stats`, `get_automation_rules_with_stats`, `get_automation_execution_log`, `get_failed_automations`, `retry_automation_execution`, `automation_audit_log`.
**Sections:**
- Engine status badge (operational/degraded/offline).
- 12 health stat cards: total/active/disabled rules, exec today/this week, success rate, completed/failed/pending execs, avg duration, last success/failure.
- 8 complaint stat cards: auto_verified, auto_assigned, needs_review, escalated, community_verification, resolved, reopened, sla_breached.
- Recent activity feed (audit log timeline).
- Execution summary.
- Automation rules table with per-rule stats.
- Execution log table (filterable by status + rule).
- Failed automations section with retry.
**Realtime:** `useAutomationRealtime` (automation_audit_log + automation_executions).
**States:** Permission-denied vs generic error; loading skeletons; empty.

## 2. Automation Rules (`/automation/rules`)
**Purpose:** Manage rules (enable/disable, edit priority/name/conditions).
**Data:** `automation_rules` — `getAutomationRules`, `updateAutomationRule`, `toggleAutomationRule`.

## 3. Automation Rule Model [S]
| Field | Description |
|-------|-------------|
| id | uuid PK |
| name | Rule name |
| trigger | Event trigger (e.g., complaint_created, sla_breach, ai_review_required) |
| conditions | JSON conditions |
| actions | JSON actions (assign, escalate, notify, request evidence) |
| priority | Execution priority |
| active | Enabled flag |
| created_at / updated_at | |

## 4. Execution Model [S]
| Field | Description |
|-------|-------------|
| id | uuid PK |
| rule_id | FK→automation_rules |
| complaint_id | FK→complaints (nullable) |
| status | pending/running/completed/failed |
| duration_ms | execution duration |
| error | failure message |
| created_at | |

## 5. Triggers (Specified)
- Complaint created → AI validation routing.
- AI review required → route to AI Review Queue.
- SLA warning/breach → escalate/notify.
- Evidence issues → request evidence.
- Safety response → assign/notify responders.

## 6. Conditions
- Category, severity, department, ward, SLA state, AI decision, status.

## 7. Actions
- Assign (department/officer).
- Escalate (severity HIGH).
- Notify (citizen/officer/admin).
- Request evidence.
- Route to AI review.
- Safety responder dispatch [S].

## 8. Notifications
- Automation actions generate notifications via `create_notification` (trigger) or direct insert.
- Admin toasts on automation events.

## 9. Audit Logs
- `automation_audit_log` [S]: every automation execution (rule, entity, action, status, actor=system, timestamp).
- `automation_complaint_history` RPC: per-complaint automation log.
- `audit_logs` [S]: privileged admin actions.

## 10. Failure Handling
- Failed executions surface in `get_failed_automations`.
- `retry_automation_execution` RPC retries.
- `retry_stuck_ai_jobs()` (database pg_cron every 2 min) retries stuck AI jobs via `net.http_post` to `ai-evidence-verification` edge function. Max 10 per run; `attempt_count` tracked; `last_error` stored.
- Express: **no automation retry** (no engine).

## 11. Gaps
- Automation tables not in version-controlled SQL [S].
- No background worker/cron for general automation in Express (only AI retry in DB).
- `REDIS_URL` declared but unused (no queue).
- Automation engine backend logic not confirmed in repo (frontend reads stats; engine likely on live project).
