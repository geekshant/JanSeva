# JanMitra — Business Requirements Document (BRD)

> **Document version:** 1.0  
> **Generated:** 2026-09-30

---

## 1. Business Problem

Municipalities receive civic complaints through unstructured channels (phone,
paper, walk-in). There is no photo evidence, no geo-location, no categorization, no
tracking, no SLA accountability, no transparency to the citizen, and no incentive
for civic participation.

## 2. Current Process

1. Citizen calls or visits municipal office.
2. Clerk logs complaint in a register.
3. Routed manually to a department (often delayed or lost).
4. No status feedback to citizen.
5. No evidence of resolution.
6. No accountability metrics.

## 3. Proposed Process

1. Citizen files complaint via app (photo + location + category + severity).
2. AI-assisted evidence validation (human-in-the-loop).
3. Human verification → department determination → officer assignment.
4. Officer acknowledges → in progress → uploads resolution evidence.
5. Community verification of resolution.
6. Resolved → closed (or reopened on dispute).
7. Citizen notified at every step; SLA tracked; gamification rewards participation.

## 4. Stakeholders

| Stakeholder | Role in process |
|-------------|-----------------|
| Citizen | Files and tracks complaints; verifies resolutions; safety |
| Officer | Acknowledges, works, resolves assigned complaints |
| Department admin | Manages department workload and officers |
| Municipal admin | City-wide governance, analytics, automation |
| Police / safety responder | Responds to SOS / safety alerts |

## 5. Business Objectives

1. Increase citizen engagement in civic reporting.
2. Reduce time-to-resolution.
3. Provide transparency and accountability.
4. Prioritize work by severity + SLA + geography.
5. Sustain engagement via gamification.
6. Improve women safety.

## 6. Business Rules

- A complaint requires at least 3 photos and a location within Bhopal.
- A citizen can only have one account per email and one per phone.
- Points are awarded only by server functions, never by clients.
- A complaint cannot be deleted after verification.
- A resolved complaint can be reopened by community dispute or admin.
- Safety SOS triggers live location sharing to trusted contacts + responders.
- Gamification penalties apply to duplicate/fake reports.

## 7. Municipal Workflow

```
Citizen files → AI validation (optional) → Human verification
  → Department determination → Officer assignment → Officer acknowledgement
  → In progress → Resolution submitted → Community verification
  → Resolved → Closed (or Reopened)
```

## 8. Department Workflow
- Receive assigned complaints (by category mapping).
- Assign to active officers in jurisdiction.
- Monitor SLA.
- Resolve with evidence.

## 9. Officer Workflow
- Receive assignment notification.
- Acknowledge.
- Update to In Progress.
- Upload resolution evidence (before/after).
- Submit for community verification.

## 10. Citizen Workflow
- Register (email/phone + Aadhaar KYC).
- Report issue.
- Track status (push + in-app notifications).
- Add evidence if requested.
- Verify resolutions of nearby complaints.
- Earn reputation.

## 11. Accountability Model

- Every status change is recorded in `complaint_status_history` (trigger).
- Officer review decisions are audited (`audit_logs` — specified).
- Admin actions (suspend/restore, assignment, escalation, delete) are audit-logged.
- SLA deadlines make departments/officers accountable for timely resolution.

## 12. SLA Model

- Per-category/department/severity deadline hours (`sla_rules`).
- States: on_track, due_soon (within warning window), at_risk, breached, escalated, resolved.
- Breaches surface on admin dashboard with live countdowns.
- Escalation increases severity to HIGH.

## 13. Reporting Requirements

- Citizen: complaint status, timeline, points, badges, leaderboard.
- Officer: assigned complaints, SLA, workload.
- Department admin: department complaints, officer performance.
- Municipal admin: city-wide analytics, SLA compliance, AI stats, automation stats,
  safety incidents.

## 14. Business Risks

| Risk | Mitigation |
|------|-----------|
| Low citizen adoption | Gamification + safety features |
| Fake/duplicate reports | AI validation + duplicate detection + penalties |
| SLA breaches | SLA monitoring + escalation |
| Privacy breach | RLS + privacy settings + minimal data exposure |
| Safety feature misuse | Audit trail + responder verification |

## 15. Business Assumptions

- The municipality commits to responding within SLA.
- Citizens have smartphones with cameras and GPS.
- Mapbox + Firebase + Supabase remain available.
- Bhopal is the initial deployment city.
