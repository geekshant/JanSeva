# JanMitra — Audit Log Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Implementation status:** Partial. `complaint_status_history` (trigger) and `rewards` (append-only) are fully implemented. A general `audit_logs` table is **referenced** in migration `12` (inserted by `officer_review_complaint`) but **NOT created** in version-controlled SQL. The admin frontend `logAudit()` writes defensively and catches `42P01` (table not found). There is **no Audit Logs page** in the admin dashboard despite a `view_audit_logs` permission. `assignment_audit_logs` and `automation_audit_log` are referenced by the admin frontend [S].

---

## 1. Audit Principle
Every sensitive administrative action must be auditable: who, what, when, entity, old value, new value, reason, and (if implemented) IP/device + request ID.

## 2. Implemented Audit Trails

### 2.1 `complaint_status_history` (fully implemented)
| Field | Source |
|-------|--------|
| id | gen_random_uuid |
| complaint_id | FK |
| status | new status |
| comment | note/reason |
| updated_by | FK→auth.users (the actor) |
| created_at | now() |

Written by `create_initial_status_history` (INSERT) and `record_status_change` (BEFORE UPDATE OF status) triggers. Captures every status transition + officer notes.

### 2.2 `rewards` (fully implemented)
Append-only point transaction log: `user_id`, `complaint_id`, `activity_type`, `points` (signed), `description`, `created_at`. No UPDATE/DELETE (RLS default deny).

### 2.3 `complaint_assignments` [S]
Records every assignment: `complaint_id`, `department_id`, `officer_id`, `assigned_by_id`, `note`, `assigned_at`.

### 2.4 `assignment_audit_logs` [S]
Assignment change log (referenced by admin frontend assignment service).

### 2.5 `automation_audit_log` [S]
Every automation execution: rule, entity, action, status, timestamp. Read by Automation Center.

## 3. `audit_logs` Table [S] (referenced, not created in repo SQL)

Inferred schema (from migration `12` INSERT in `officer_review_complaint`):
| Field | Type | Meaning |
|-------|------|---------|
| id | uuid | PK |
| actor_id | uuid | FK→auth.users (who) |
| action | text | e.g. `OFFICER_REVIEW` |
| entity_type | text | e.g. `complaint` |
| entity_id | uuid | what entity |
| after | jsonb | new state (what) |
| created_at | timestamptz | when |

**Admin frontend `logAudit()`** (services/audit.ts) writes `actor_id`, `action`, `entity_type`, `entity_id`, `after` and catches `42P01` (relation does not exist) silently — falling back to `complaint_status_history` comments.

## 4. Audit Events

| Event | Actor | Table | Implemented |
|-------|-------|-------|-------------|
| Complaint submitted | Citizen | complaint_status_history | ✅ (trigger) |
| Status change | Officer/Admin | complaint_status_history | ✅ (trigger) |
| Officer review (verify/reject/evidence) | Officer/Admin | audit_logs + complaint_ai_verification | ✅ (officer_review_complaint writes audit_logs) [S table] |
| Assignment | Officer/Admin | complaint_assignments + assignment_audit_logs | ✅ [S tables] |
| Reassignment | Officer/Admin | assignment_audit_logs | ✅ [S] |
| Evidence request | Officer/Admin | complaint_status_history (comment) + audit_logs | Partial |
| Evidence upload | Citizen | complaint_images (append) | ✅ |
| AI override | Officer/Admin | complaint_ai_verification (review_*) + audit_logs | ✅ [S table] |
| SLA rule change | Admin | sla_rules (CRUD) | ✅ [S table] |
| Officer change | Admin | officers (soft delete) + audit_logs | Partial |
| Department change | Admin | departments (CRUD) + audit_logs | Partial |
| Citizen suspend/restore | System Admin | profiles + audit_logs | Partial (admin `logAudit`) |
| Safety acknowledge/resolve | Responder | safety_incidents + audit_logs | Partial |
| Police assignment | System | audit_logs | [S] |
| Gamification adjustment | System | rewards (append-only) | ✅ (trigger) |
| Automation execution | System | automation_audit_log | ✅ [S table] |
| Bulk delete | System Admin | audit_logs + bulk_delete_complaints | Partial |

## 5. IP/Device/Request ID
- **IP/device:** NOT captured in `audit_logs` (inferred schema has no `ip`/`user_agent` columns). The Express backend's `AuditLog` model DOES have `ip` + `userAgent` (Prisma schema) — but that backend is not wired to the admin frontend.
- **Request ID:** Express captures `req.requestId` (requestContext middleware) and logs it, but does not write it to `audit_logs`. Admin frontend has no request ID concept.

## 6. Audit Log Page
**Missing.** No `/audit-logs` route exists. `listAuditLogs()` function exists in admin `services/audit.ts` but is not called by any hook or page. `view_audit_logs` permission is defined in `RolesPermissionsPage` but has no UI. This is a gap — see `40_GAP_ANALYSIS.md`.

## 7. Recommendations
1. Version-control the `audit_logs`, `assignment_audit_logs`, `automation_audit_log` table DDL.
2. Add an Audit Logs page to the admin dashboard with filters (actor, action, entity, date).
3. Capture IP/user-agent/request-ID where available.
4. Ensure all privileged admin actions write to `audit_logs` (not just `complaint_status_history` comments).
