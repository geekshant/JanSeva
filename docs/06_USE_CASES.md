# JanMitra — Use Case Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Convention:** `UC-<area>-<n>`.

Each use case: UC ID, Name, Actor, Trigger, Preconditions, Main flow, Alternate flow, Exception flow, Postconditions, Related requirements.

---

## UC-AUTH-01 Citizen Registration
- **Actor:** Citizen
- **Trigger:** Opens app first time → Register
- **Preconditions:** None
- **Main flow:** Enter name/email/phone/password → validate → `auth.signUp` → `handle_new_user` creates profile → auto sign-in → Home
- **Alternate flow:** Skip to login if account exists
- **Exception flow:** Duplicate email/phone → friendly error; weak password → hints
- **Postconditions:** `profiles` row exists; session active
- **Related:** REQ-AUTH-01/06/07

## UC-AUTH-02 Citizen Login (email or phone)
- **Actor:** Citizen
- **Trigger:** Opens login screen
- **Preconditions:** Account exists
- **Main flow:** Enter identifier+password → if phone, `resolve_phone_login` → `signInWithPassword` → Home
- **Exception flow:** Wrong credentials → "invalid credentials"; unknown phone → "no account found"
- **Postconditions:** Session active; user-scoped providers invalidated+reloaded
- **Related:** REQ-AUTH-02

## UC-AUTH-03 Aadhaar KYC
- **Actor:** Citizen
- **Trigger:** Aadhaar registration screen (optional)
- **Preconditions:** Authenticated
- **Main flow:** Enter Aadhaar+name+consent → `submit_aadhaar_registration` → verified → Profile shows masked number
- **Exception flow:** Different Aadhaar already used → `aadhaar_already_registered`; skip allowed
- **Related:** REQ-AUTH-05

## UC-AUTH-04 Admin Login
- **Actor:** Admin/Officer
- **Trigger:** Opens admin dashboard /login
- **Main flow:** Email+password → Supabase Auth → role from `app_metadata.role` → Dashboard
- **Exception flow:** Citizen role → no admin access (server-enforced)
- **Related:** REQ-AUTH-08

## UC-CMP-01 Create Complaint
- **Actor:** Citizen
- **Trigger:** Taps Report FAB
- **Preconditions:** Authenticated
- **Main flow:** Category → Photos(≥3) → Location (Bhopal geofence) → Details → Review → `find_similar_complaints` → `create_complaint`/`join_similar_complaint` → fire `ai-evidence-verification` → Success
- **Alternate flow:** Join a similar complaint instead
- **Exception flow:** <3 photos → blocked; outside Bhopal → error; upload failure → retry keeps state
- **Postconditions:** Complaint + images created; status SUBMITTED/AI_CHECKING; +50 points; notification; status history
- **Related:** REQ-CMP-01..06

## UC-CMP-02 View Complaint Detail
- **Actor:** Citizen/Admin
- **Trigger:** Tap complaint
- **Main flow:** Load detail with relations (timeline, assignment, AI, evidence, resolution evidence, community verification) → realtime refresh
- **Related:** REQ-CMP-11

## UC-CMP-03 Add Evidence
- **Actor:** Citizen
- **Trigger:** Status EVIDENCE_REQUIRED/AI_FAILED on own complaint
- **Main flow:** Upload photos → `add_evidence_to_complaint` → re-queue AI
- **Exception flow:** Non-owner → denied (server-side)
- **Related:** REQ-CMP-09

## UC-CMP-04 Delete Complaint
- **Actor:** Citizen
- **Trigger:** Delete action on pre-verification complaint
- **Main flow:** Delete storage images → delete row
- **Exception flow:** Verified+ → delete disabled
- **Related:** REQ-CMP-10

## UC-CMP-05 Nearby Complaints / Map
- **Actor:** Citizen
- **Trigger:** Opens Map
- **Main flow:** GPS or manual center → radius → `nearby_complaints`/`nearby_complaints_heatmap` → markers/heatmap → tap marker → detail sheet → View Details
- **Alternate flow:** Filter by category/status
- **Related:** REQ-CMP-12/13, REQ-MAP-*

## UC-CMP-06 Admin Change Status
- **Actor:** Officer/Admin
- **Trigger:** Complaint detail → Change Status
- **Preconditions:** Role allowed for transition
- **Main flow:** Pick allowed next status → optional note → update → history + notification + realtime
- **Exception flow:** Invalid transition → blocked
- **Related:** REQ-CMP-08

## UC-CMP-07 Assign Complaint
- **Actor:** Officer/Admin
- **Trigger:** Complaint detail → Assign
- **Main flow:** Pick department + officer → `manual_assign_complaint` → status ASSIGNED + assignment record + history + notifications
- **Exception flow:** Closed complaint → blocked
- **Related:** REQ-DEP-04

## UC-CMP-08 Escalate Complaint
- **Actor:** Admin
- **Trigger:** Escalate dialog
- **Main flow:** Reason → severity HIGH + history + notification
- **Related:** (admin escalate)

## UC-CMP-09 Reopen Complaint
- **Actor:** Admin/Citizen (via community dispute)
- **Trigger:** Reopen dialog / community dispute
- **Main flow:** `reopen_complaint` → status + reason + history + notification
- **Related:** REQ-CV-03

## UC-AI-01 AI Evidence Validation
- **Actor:** System (AI edge function)
- **Trigger:** Complaint created (status AI_CHECKING)
- **Main flow:** Edge function analyzes images vs category/title/description → writes `complaint_ai_verification` (decision PASS/REVIEW/FAIL, confidence) → status AI_VERIFIED/AI_REVIEW_REQUIRED/AI_FAILED
- **Alternate flow:** Edge function failure → `retry_stuck_ai_jobs` via pg_cron
- **Exception flow:** AI failure → human review (never silent reject)
- **Related:** REQ-AI-01..06

## UC-AI-02 Human Review (Officer Override)
- **Actor:** Officer/Admin
- **Trigger:** AI Review Queue / complaint detail AI panel
- **Main flow:** View AI analysis + evidence → verify/reject/request-evidence with structured reason → `officer_review_complaint` → update AI table + status + audit + notifications
- **Related:** REQ-AI-04

## UC-DEP-01 Manage Departments
- **Actor:** Admin
- **Main flow:** CRUD departments + category mapping
- **Exception flow:** Delete dept with assigned complaints → blocked
- **Related:** REQ-DEP-01/02

## UC-DEP-02 Manage Officers
- **Actor:** Admin
- **Main flow:** CRUD officers (profile, department, role, active)
- **Related:** REQ-DEP-03

## UC-SLA-01 Monitor SLA
- **Actor:** Admin
- **Main flow:** SLA page → KPIs + tables with countdowns → escalate breached
- **Related:** REQ-SLA-03/04

## UC-SLA-02 Configure SLA Rules
- **Actor:** Admin
- **Main flow:** CRUD `sla_rules`
- **Related:** REQ-SLA-02

## UC-GAM-01 Earn Points
- **Actor:** System
- **Trigger:** Complaint insert (VALID_ISSUE_REPORT +50), status→VERIFIED (+100), status→RESOLVED (+25), status→REJECTED (−50)
- **Main flow:** `award_points` reads `reward_rules` (idempotent) → update `profiles.points`/`level` (GUC) → `check_and_award_badges` → notification
- **Exception flow:** Client attempt to write points → trigger rejects
- **Related:** REQ-GAM-01..04/07

## UC-GAM-02 View Leaderboard
- **Actor:** Citizen
- **Main flow:** `community_leaderboard` → top-3 + list (privacy-safe)
- **Related:** REQ-GAM-05

## UC-NOT-01 Receive Notification
- **Actor:** Citizen
- **Trigger:** DB event (complaint status, reward, badge)
- **Main flow:** Trigger writes `notifications` → edge function drains outbox → FCM push + in-app
- **Related:** REQ-NOT-01..03

## UC-NOT-02 Register Device Token
- **Actor:** Citizen
- **Main flow:** FCM token → `device_tokens` upsert (respects `notify_push`)
- **Related:** REQ-NOT-05

## UC-SAF-01 Trigger SOS
- **Actor:** Citizen
- **Trigger:** Long-press SOS + countdown
- **Main flow:** `trigger_sos` → `safety_incidents` → live `share_location` every 15s → trusted contacts + responders notified
- **Alternate flow:** `cancel_sos`
- **Related:** REQ-SAF-01

## UC-SAF-02 Safety Check-in
- **Actor:** Citizen
- **Main flow:** `create_safety_checkin` (interval) → countdown → `complete_safety_checkin` OR auto-SOS on miss
- **Related:** REQ-SAF-03

## UC-SAF-03 Admin Handle Safety Alert
- **Actor:** Police/Responder
- **Main flow:** Safety Alerts page → view active alert (location, contacts) → acknowledge → resolve
- **Related:** REQ-SAF-06

## UC-CV-01 Community Verification
- **Actor:** Citizen
- **Trigger:** Nearby resolved+pending complaint
- **Main flow:** `verifiable_complaints` → view before/after → comment + photos → `submit_community_verification` (confirm/dispute)
- **Exception flow:** Already verified by this citizen → blocked
- **Related:** REQ-CV-01/02

## UC-ANL-01 View Analytics
- **Actor:** Admin
- **Main flow:** Analytics page → KPIs + charts (trends, categories, statuses, AI, SLA, departments, wards, civic health)
- **Related:** REQ-ANL-*

## UC-AUT-01 Manage Automation
- **Actor:** Admin
- **Main flow:** Automation Center → view stats/rules/log → enable/disable rules → retry failed
- **Related:** REQ-AUT-*

## UC-INC-01 Manage Civic Incidents
- **Actor:** Admin
- **Main flow:** Create incident → link complaints → view photos/stats → merge
- **Related:** (incidents)

## UC-PRO-01 Edit Profile
- **Actor:** Citizen
- **Main flow:** Edit whitelisted fields → update → avatar upload to `avatars` bucket
- **Exception flow:** Attempt to write points/level → trigger rejects
- **Related:** REQ-PRO-01/02

## UC-PRO-02 Data Download / Account Deletion
- **Actor:** Citizen
- **Main flow:** `download-my-data` edge fn (JSON) / `request_account_deletion` (30-day grace) / cancel
- **Related:** REQ-PRO-04

## UC-ADM-01 Bulk Delete Complaints
- **Actor:** Admin
- **Main flow:** Select rows → reason → `bulk_delete_complaints` RPC
- **Related:** (admin complaints)

## UC-ADM-02 Suspend/Restore Citizen
- **Actor:** System Admin
- **Main flow:** `suspendCitizen`/`restoreCitizen` → profiles update + audit
- **Related:** (admin citizens)
