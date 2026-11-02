# JanMitra — Department & Officer Management Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30

> **Implementation status:** The `departments` and `officers` tables are
> **referenced** by the admin frontend and migration `12` but are **NOT created** in
> version-controlled SQL. They exist on the live Supabase project. `manual_assign_complaint`
> RPC and `assignment_audit_logs` are referenced by the admin frontend. Full
> automatic assignment logic (jurisdiction, distance, workload) is **specified but
> not confirmed implemented** — currently assignment is manual. The Express backend
> has its own parallel `Department`/`User` models in the `admin` schema with manual
> assignment.

---

## 1. Departments

| Field | Description |
|-------|-------------|
| `id` | uuid PK |
| `name` | Department name |
| `code` | Unique code (e.g., `ROADS`, `SAFETY`) |
| `description` | |
| `categoryMapping` / mapping | Maps complaint categories to this department |
| `isActive` / `active` | Active flag |
| `createdAt` / `updatedAt` | |

**Admin UI:** Departments page (CRUD), Department detail (stats: active/resolved complaints, SLA breaches, avg resolution, officer count; recent complaints; SLA rules).

## 2. Officers

| Field | Description |
|-------|-------------|
| `id` | uuid PK |
| `profile_id` | FK → `profiles` (joined to get name/avatar) |
| `department_id` | FK → `departments` |
| `title` / role | Officer title/role |
| `active` | Active status |
| `deleted_at` | Soft delete (admin frontend filters `deleted_at IS NULL`) |
| jurisdiction / geographic coverage | **[S]** — referenced in prompt; not confirmed in schema |

**Admin UI:** Officers page (CRUD, department/role filter), Officer detail (stats: assigned, completed, SLA breaches, avg resolution; recent complaints).

## 3. Category → Department Mapping

`departments.categoryMapping` (text[] in Express backend) maps category names/codes to departments. Used to determine which department a complaint belongs to. In the Supabase public schema, the mapping table/mechanism is **[S]** (referenced, not in repo SQL).

## 4. Manual Assignment Flow (Implemented)

`manual_assign_complaint` RPC (admin frontend → Supabase):
1. Admin opens complaint detail → Assign dialog.
2. Picks department + officer.
3. RPC validates: department exists; officer exists, active, not soft-deleted; complaint not closed/terminal.
4. Transaction: update complaint (`assigned_department_id`, `assigned_officer_id`, status→ASSIGNED); insert `complaint_assignments` (assigner, note); insert `complaint_status_history`.
5. Notify citizen ("Assigned to <dept>") + officer ("New complaint assigned").
6. Broadcast realtime to dept + user rooms.
7. Write `assignment_audit_logs`.

## 5. Automatic Assignment Logic (Specified — not confirmed implemented)

The intended automatic assignment (per project prompt), when a complaint is verified:

1. Determine complaint category.
2. Determine mapped department.
3. Verify department/category compatibility.
4. Find eligible active officers.
5. Filter by jurisdiction.
6. Calculate distance from complaint location.
7. Consider officer workload/capacity.
8. Select appropriate officer.
9. Assign complaint.
10. Notify officer + department.
11. Record audit event.

**Never** assign an officer from an incompatible department/category.

## 6. Fallback Behavior (Specified)

| Condition | Fallback |
|-----------|----------|
| No department mapping exists | Leave unassigned; admin manually routes |
| No officer exists | Leave at department level; admin assigns |
| No officer available | Queue; notify department admin |
| Location missing | Skip distance filter; assign by workload |
| Officer inactive | Exclude from candidates |
| Officer outside jurisdiction | Exclude |
| All officers exceed capacity | Escalate to department admin |

**Current reality:** Steps 4–10 of auto-assignment are **not confirmed implemented** in repo code. Manual assignment via `manual_assign_complaint` is the working path. The Express backend also only implements manual assignment (`PATCH /complaints/:id/assign`).

## 7. Police Assignment (Safety)

See `12_SAFETY_RESPONSE_SPEC.md`. Safety alert acknowledgment/resolution is implemented in admin. Full closest-police-officer/station auto-dispatch is **specified but not confirmed implemented**.

## 8. Audit

- `complaint_assignments` records every assignment (assigner, officer, dept, note, time).
- `assignment_audit_logs` records assignment changes.
- `complaint_status_history` records the ASSIGNED transition.
- `audit_logs` (specified) records privileged assignment actions.
