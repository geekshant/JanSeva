# JanMitra — SLA Management Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30

> **Implementation status:** The `complaints.sla_deadline` column exists in repo SQL
> (`01_schema.sql`) but **no SLA engine, policy table, or population logic** is in
> version-controlled SQL. The admin frontend has a full **SLA Management** page
> (overview, rules, breaches, escalations) reading a `sla_rules` table [S] and
> computing SLA states on-demand. The Express backend computes `slaDueAt` at
> complaint creation (`computeSlaDeadline(category)`) and evaluates state at query
> time (`evaluateSlaState`) — but has **no background monitor** and **never sends**
> `SLA_WARNING` notifications. SLA monitoring is therefore **partially implemented**
> (reactive query + admin UI) but **missing proactive warning notifications and
> automatic deadline population in the public-schema path**.

---

## 1. SLA Configuration

`sla_rules` table [S] (admin CRUD via SLA Rules page):
| Field | Description |
|-------|-------------|
| `id` | uuid PK |
| category / `category_id` | Category (optional) |
| `department_id` | Department (optional) |
| `severity` | Severity level |
| `deadline_hours` | Total time to resolve |
| `warning_hours` | Warning threshold (due soon) |
| `critical_hours` | Critical threshold (at risk) |
| `active` | Rule active flag |

Rules can be scoped per category, per department, per severity, or any combination.

## 2. Severity Levels

Per `complaint_severity` enum (repo `01_schema.sql`): `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.

Example SLA (Express backend `constants/sla.ts`, per category — illustrative):
| Category | SLA hours |
|----------|-----------|
| Pothole / Road Damage | 72 |
| Garbage / Sanitation | 48 |
| Streetlight | 48 |
| Water / Drainage | 48 |
| Public Safety (SAFETY_HAZARD) | 24 |
| Others | 96 |

## 3. Deadline

- `complaints.sla_deadline` (timestamptz) — set at creation/verification based on the matching SLA rule.
- Express backend: `computeSlaDeadline(category)` = `now() + slaHours`.
- Public schema: column exists but population logic is [S] (not in repo SQL; likely a live trigger or RPC).

## 4. Warning Threshold

- `warning_hours` → "due soon" state (deadline within warning window).
- `critical_hours` → "at risk" state.
- Express backend uses a fixed 24h window for DUE_SOON.

## 5. SLA States

| State | Condition |
|-------|-----------|
| ON_TRACK | deadline far; active |
| DUE_SOON | deadline within warning window; active |
| AT_RISK | deadline within critical window; active |
| BREACHED | deadline passed; active; non-high severity |
| ESCALATED | deadline passed; active; high/critical severity |
| RESOLVED | status RESOLVED/CLOSED |

Computed on-demand by `evaluateSlaState(status, slaDueAt)` (Express) or admin frontend logic.

## 6. SLA Timer / Pause-Resume

**Not implemented.** SLA is a fixed deadline from creation/verification. No pause/resume for "waiting on citizen" or "evidence requested" states. This is a gap.

## 7. SLA Breach

- `sla_deadline < now()` AND active → BREACHED/ESCALATED.
- Admin SLA Breached page lists breached complaints (non-high severity).
- Admin SLA Escalations page lists escalated complaints (high/critical severity).
- Dashboard toast on breach/escalation count increase (`useSlaBreachAlerts`).

## 8. Escalation

- Admin escalate action → severity HIGH + history + notification.
- Escalated complaints appear in SLA Escalations page.

## 9. Notifications

| Event | Recipient | Channel | Status |
|-------|-----------|---------|--------|
| SLA breach | Admin | Toast + dashboard | Implemented (reactive) |
| SLA escalation | Admin | Toast + dashboard | Implemented (reactive) |
| SLA warning (pre-breach) | Officer/Admin | Push/in-app | **Missing** — `SLA_WARNING` type defined but never sent (no background monitor) |

## 10. Dashboard Indicators

- SLA page: 6 KPI cards (on_track, due_soon, at_risk, breached, escalated, resolved).
- SLA lifecycle visual.
- 3 tables (at-risk, due-soon, breached) with live countdowns (`SlaCountdown`).
- Per-complaint `SlaBadge` (ON_TRACK/DUE_SOON/AT_RISK/BREACHED/ESCALATED/RESOLVED).

## 11. Analytics

- `get_analytics_summary` includes SLA summary (overdue/dueSoon/onTrack counts).
- Department performance includes SLA breach counts.

## 12. Gaps

- No proactive SLA warning notifications (no background job/cron).
- No SLA pause/resume.
- `sla_deadline` population in public schema not confirmed in repo SQL.
- `sla_rules` table not in version-controlled SQL.
- `sla_events` table type "PREPARED — not yet in database" (admin frontend types).
