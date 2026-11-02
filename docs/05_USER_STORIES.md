# JanMitra — User Stories & Acceptance Criteria

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Convention:** `US-<role>-<n>`. Every story has testable acceptance criteria, including edge/failure cases.

---

## Citizen Stories

### US-CIT-01 Register with email
**As a** citizen, **I want to** register with my email, phone, and password, **so that** I can file complaints.
**Acceptance:**
- Entering valid email + 10-digit phone + strong password succeeds and signs me in.
- Duplicate email → friendly "account already exists" error.
- Duplicate phone → friendly "phone already registered" error.
- Weak password → inline requirement hints.
- On success, a `profiles` row is auto-created and I land on Home.

### US-CIT-02 Login with phone
**As a** citizen, **I want to** log in with my phone number, **so that** I don't need to remember my email.
**Acceptance:**
- `9876543210` or `+919876543210` resolves to my account and signs me in.
- Unknown phone → "no account found" error.
- Wrong password → "invalid credentials".

### US-CIT-03 Aadhaar KYC (optional)
**As a** citizen, **I want to** verify my identity with Aadhaar, **so that** my account is trusted.
**Acceptance:**
- Valid 12-digit Aadhaar + name (≥3 chars) + consent → `verified` status, masked number shown.
- Same Aadhaar on another account → `aadhaar_already_registered`.
- Skip ("verify later") is allowed and I can still use the app.

### US-CIT-04 Report a complaint
**As a** citizen, **I want to** report a civic issue with photos and location, **so that** the municipality can fix it.
**Acceptance:**
- I can complete the 5-step wizard in under a minute.
- Fewer than 3 photos blocks submission.
- A location outside Bhopal shows an error and clears the location.
- On success, I see a complaint number and the actual points awarded.
- Duplicate submission (same idempotency key) does not create a second complaint.

### US-CIT-05 Detect similar complaints
**As a** citizen, **I want to** see similar nearby complaints before submitting, **so that** I can join an existing report.
**Acceptance:**
- On the Review step, similar same-category complaints within 250m are shown ranked by title similarity.
- Choosing "Submit & Join" files a linked complaint.
- Choosing to file new creates an independent complaint.

### US-CIT-06 Track my complaint
**As a** citizen, **I want to** see the status timeline of my complaint, **so that** I know what's happening.
**Acceptance:**
- My Complaints lists all my complaints (limit 100) with search/filter/sort.
- Detail shows timeline, assignment, AI status, evidence, resolution evidence.
- Realtime updates refresh the list and detail without manual pull.

### US-CIT-07 Add more evidence
**As a** citizen, **I want to** add more photos when asked, **so that** my complaint can proceed.
**Acceptance:**
- When status is EVIDENCE_REQUIRED or AI_FAILED, I can upload new photos via `add_evidence_to_complaint`.
- Photos are appended to the evidence gallery as a new round.
- Non-owner cannot add evidence.

### US-CIT-08 Delete a complaint
**As a** citizen, **I want to** delete a complaint I just filed, **so that** I can fix mistakes.
**Acceptance:**
- Only pre-verification statuses (submitted, auto_validating, needs_review, ai_checking) are deletable.
- Verified+ complaints cannot be deleted.
- Storage images are deleted before the row.

### US-CIT-09 View nearby issues
**As a** citizen, **I want to** see nearby complaints on a map, **so that** I'm aware of local issues.
**Acceptance:**
- Map shows markers within the selected radius (500m–10km).
- Heatmap toggle shows density.
- Tapping a marker shows a detail sheet with a "View Details" link.
- Markers/heatmap refresh in realtime.

### US-CIT-10 Verify a resolution
**As a** citizen, **I want to** verify a nearby resolved complaint, **so that** the community holds the municipality accountable.
**Acceptance:**
- I see only RESOLVED + pending complaints within my radius.
- I can Confirm or Dispute with a comment + mandatory photos.
- I can only verify once per complaint.
- After enough disputes, the complaint can be reopened.

### US-CIT-11 Earn points and badges
**As a** citizen, **I want to** earn points and badges, **so that** I'm rewarded for participation.
**Acceptance:**
- Valid report → +50; verified → +100; resolved → +25; duplicate/fake → −50.
- Points/level are shown via `get_reputation_summary` and I cannot manipulate them.
- Badges auto-award when criteria are met.

### US-CIT-12 See the leaderboard
**As a** citizen, **I want to** see the leaderboard, **so that** I'm motivated.
**Acceptance:**
- Top-3 podium + full list with `is_me` highlight.
- Users with `privacy_show_leaderboard=false` are excluded.
- No user ids or emails are exposed.

### US-CIT-13 Trigger SOS
**As a** citizen, **I want to** trigger an SOS with live location, **so that** trusted people can help me.
**Acceptance:**
- Long-press + 3-2-1 countdown triggers SOS (prevents accidental triggers).
- Live location shared every 15s until cancelled.
- Cancel returns me to the safety screen.
- Trusted contacts are notified.

### US-CIT-14 Manage trusted contacts
**As a** citizen, **I want to** add up to 3 trusted contacts, **so that** they are alerted during SOS.
**Acceptance:**
- I can add/edit/delete up to 3 contacts (name + phone + relationship).
- Phone must be valid 10-digit/+91.
- 4th contact is blocked.

### US-CIT-15 Safety check-in
**As a** citizen, **I want to** set a safety check-in timer, **so that** SOS auto-triggers if I don't check in.
**Acceptance:**
- I can set 15/30/60/120 min.
- "I'm safe" completes the check-in.
- Missed check-in auto-triggers SOS.

### US-CIT-16 Nearby safe places
**As a** citizen, **I want to** find nearby police/hospitals/safe places, **so that** I can get help.
**Acceptance:**
- List shows places within radius with call + directions buttons.

### US-CIT-17 Anonymous report
**As a** citizen, **I want to** report something anonymously, **so that** my identity is protected.
**Acceptance:**
- Message + optional location → `submit_anonymous_report`.
- No personal identifier is attached.

### US-CIT-18 Receive notifications
**As a** citizen, **I want to** be notified of complaint status changes, **so that** I don't have to keep checking.
**Acceptance:**
- In-app + push notifications fire on submitted/verified/assigned/in-progress/resolved/reward/badge.
- I can mark read (optimistic) and mark all read.
- Push respects `notify_push` preference.
- Tap navigates to the relevant complaint.

### US-CIT-19 Manage privacy
**As a** citizen, **I want to** control my privacy, **so that** I'm comfortable using the app.
**Acceptance:**
- I can set profile visibility, location precision, Aadhaar masking.
- I can download my data, delete my account (30-day grace + cancel), logout all devices, clear location history.
- Excluding myself from the leaderboard takes effect immediately.

### US-CIT-20 Accessibility
**As a** citizen, **I want to** adjust accessibility, **so that** the app is usable for me.
**Acceptance:**
- Font scale, high contrast, reduce motion, screen reader hints, larger touch targets are adjustable and persist.

---

## Admin / Officer Stories

### US-ADM-01 Log in as admin
**As a** municipal admin, **I want to** log in to the dashboard, **so that** I can manage complaints.
**Acceptance:**
- Email + password signs me in via Supabase Auth; role from `app_metadata.role`.
- Citizen accounts cannot access admin actions (server-side enforced).

### US-ADM-02 View dashboard
**As a** municipal admin, **I want to** see city-wide KPIs and a map, **so that** I understand the situation.
**Acceptance:**
- KPI row + interactive map + complaint list + AI insights load within 3s.
- Filters and search refine the view.
- Realtime updates refresh data.

### US-ADM-03 Review AI queue
**As an** officer, **I want to** review AI-flagged complaints, **so that** I can verify or reject them.
**Acceptance:**
- AI Review Queue lists complaints needing human review.
- I can verify (with reason), reject (with reason), or request evidence (with reason).
- My decision updates `complaint_ai_verification` + complaint status + audit log + notifications.

### US-ADM-04 Assign a complaint
**As an** officer, **I want to** assign a complaint to a department and officer, **so that** it gets resolved.
**Acceptance:**
- `manual_assign_complaint` assigns to a department + officer.
- Status → ASSIGNED; assignment record + history + notifications created.
- Cannot assign a closed complaint.

### US-ADM-05 Change complaint status
**As an** officer, **I want to** advance a complaint through its lifecycle, **so that** work progresses.
**Acceptance:**
- Only allowed transitions (per role) are offered.
- Each change creates a status history entry + notification.

### US-ADM-06 Escalate a complaint
**As an** admin, **I want to** escalate a complaint, **so that** it gets priority attention.
**Acceptance:**
- Escalation sets severity to HIGH + records reason + history.

### US-ADM-07 Reopen a complaint
**As an** admin, **I want to** reopen a resolved complaint, **so that** unresolved issues get attention.
**Acceptance:**
- `reopen_complaint` sets status + records reason + history + notification.

### US-ADM-08 Manage departments
**As an** admin, **I want to** create and manage departments, **so that** complaints route correctly.
**Acceptance:**
- CRUD on departments; category mapping; cannot delete a department with assigned complaints.

### US-ADM-09 Manage officers
**As an** admin, **I want to** create and manage officers, **so that** work is assigned to the right people.
**Acceptance:**
- CRUD on officers; department + role + status; detail shows workload stats.

### US-ADM-10 Monitor SLA
**As an** admin, **I want to** see SLA breaches, **so that** I can escalate.
**Acceptance:**
- SLA page shows on-track/due-soon/at-risk/breached/escalated with countdowns.
- Breach/escalation toasts fire on count increase.

### US-ADM-11 Suspend a citizen
**As a** system admin, **I want to** suspend a citizen, **so that** abusive accounts are stopped.
**Acceptance:**
- Only SYSTEM_ADMIN can suspend/restore.
- Reason recorded; audit logged.

### US-ADM-12 Manage automation
**As an** admin, **I want to** view and manage automation rules, **so that** the engine runs well.
**Acceptance:**
- Automation Center shows engine status, stats, execution log, failed retries.
- I can enable/disable/edit rules.
- I can retry failed executions.

### US-ADM-13 Handle safety alerts
**As a** safety responder, **I want to** see and acknowledge SOS alerts, **so that** I can respond.
**Acceptance:**
- Active alerts show with location, trusted contacts, message.
- I can acknowledge and resolve.
- Buzzer alerts me to new active alerts.

### US-ADM-14 View analytics
**As an** admin, **I want to** see analytics, **so that** I can make decisions.
**Acceptance:**
- Overview + sub-pages (complaints, resolution, departments, wards, civic health) load with charts.
- Date range selector (7/30/90 days).

### US-ADM-15 View audit trail
**As an** admin, **I want to** see who did what, **so that** there is accountability.
**Acceptance:**
- Status history is always visible on complaint detail.
- Full audit log page is **specified but not confirmed implemented** (no Audit Logs page; `audit_logs` table not in repo SQL).

---

## Department Admin Stories

### US-DAD-01 Manage my department
**As a** department admin, **I want to** see my department's complaints and officers, **so that** I balance workload.
**Acceptance:**
- I see only my department's data.
- I cannot touch SYSTEM_ADMIN users or other departments.

---

## Police / Safety Responder Stories

### US-POL-01 Respond to SOS
**As a** police responder, **I want to** receive SOS alerts, **so that** I can dispatch help.
**Acceptance:**
- Safety Alerts page shows active alerts with location + trusted contacts.
- Acknowledge → resolve lifecycle tracked.
- (Full closest-officer/station auto-assignment is **specified but not confirmed implemented**.)

---

## System Administrator Stories

### US-SYS-01 Configure categories
**As a** system admin, **I want to** manage categories, **so that** reporting stays relevant.
**Acceptance:**
- CRUD on categories (name, description, icon, active).

### US-SYS-02 Configure AI per category
**As a** system admin, **I want to** tune AI settings per category, **so that** validation is appropriate.
**Acceptance:**
- `category_ai_config` (requires_images, min/max images, review_threshold, category_hints, ai_enabled, auto_pass, auto_fail).

### US-SYS-03 Configure gamification
**As a** system admin, **I want to** configure badges and reward rules, **so that** incentives are right.
**Acceptance:**
- Badge CRUD, reward rule CRUD. Points are trigger-managed (read-only notice shown).

### US-SYS-04 Demo mode
**As a** system admin, **I want to** seed demo data, **so that** I can demonstrate the platform.
**Acceptance:**
- `seed_demo_complaints` creates 15 Bhopal complaints; `advance_demo_complaints` advances the workflow.
