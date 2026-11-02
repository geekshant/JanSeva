# JanMitra — Complete Test Case Document

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Convention:** `TC-<module>-<n>`. Format: TC-ID, Feature, Scenario, Preconditions, Steps, Expected result, Priority, Type.

---

## Auth

| TC-ID | Scenario | Steps | Expected | Priority | Type |
|-------|----------|-------|----------|----------|------|
| TC-AUTH-01 | Register with valid email+phone | Enter name/email/phone/password → submit | Profile created, signed in, Home | P0 | Positive |
| TC-AUTH-02 | Register duplicate email | Use existing email | "account already exists" error | P0 | Negative |
| TC-AUTH-03 | Register duplicate phone | Use existing phone | "phone already registered" | P0 | Negative |
| TC-AUTH-04 | Register weak password | <min length | Inline hints block submit | P1 | Validation |
| TC-AUTH-05 | Login with email | Enter email+password | Sign in → Home | P0 | Positive |
| TC-AUTH-06 | Login with phone | Enter 10-digit phone+password | resolve_phone_login → sign in | P0 | Positive |
| TC-AUTH-07 | Login wrong password | Enter valid id + wrong password | "invalid credentials" | P0 | Negative |
| TC-AUTH-08 | Login unknown phone | Enter unregistered phone | "no account found" | P1 | Negative |
| TC-AUTH-09 | Logout | Tap logout → confirm | Sign out → login; providers invalidated | P0 | Positive |
| TC-AUTH-10 | Password reset | Email → reset link → new password | Password updated → Home | P1 | Positive |
| TC-AUTH-11 | Aadhaar valid | 12-digit + name + consent | verified, masked shown | P1 | Positive |
| TC-AUTH-12 | Aadhaar duplicate (different user) | Same Aadhaar on 2 accounts | aadhaar_already_registered | P1 | Negative |
| TC-AUTH-13 | Aadhaar skip | Tap "verify later" | App usable without Aadhaar | P2 | Alternate |
| TC-AUTH-14 | Reputation manipulation | Try to update points via API | Trigger rejects (protect_reputation_columns) | P0 | Security |

## Report Issue

| TC-ID | Scenario | Steps | Expected | Priority | Type |
|-------|----------|-------|----------|----------|------|
| TC-REP-01 | Full valid report | Category→3 photos→GPS→details→submit | Complaint created, +50 pts, success screen | P0 | Positive |
| TC-REP-02 | <3 photos | Upload 2 photos → submit | Blocked at photo step | P0 | Validation |
| TC-REP-03 | >5 photos | Upload 6 | 6th rejected | P1 | Boundary |
| TC-REP-04 | Outside Bhopal | Pick location outside geofence | Error + location cleared | P0 | Validation |
| TC-REP-05 | Title <3 chars | Enter 2-char title | Blocked at details step | P1 | Validation |
| TC-REP-06 | Title >200 chars | Enter 201 chars | Truncated/blocked | P2 | Boundary |
| TC-REP-07 | Duplicate submission | Same idempotency key twice | One complaint created | P0 | Concurrency |
| TC-REP-08 | Similar complaint found | find_similar_complaints returns match | Banner + "Submit & Join" option | P1 | Positive |
| TC-REP-09 | Join similar | Pick match → submit | join_similar_complaint creates linked complaint | P1 | Positive |
| TC-REP-10 | Upload failure + retry | Upload fails → retry | Retry uploads; state+images kept | P1 | Recovery |
| TC-REP-11 | Network failure on submit | Offline during submit | Error kept; retry on reconnect | P1 | Network |
| TC-REP-12 | Non-image file | Pick .pdf | Rejected (type validation) | P1 | Validation |
| TC-REP-13 | Oversized image | >10MB | Rejected (size validation) | P1 | Validation |

## Complaint Tracking

| TC-ID | Scenario | Steps | Expected | Priority | Type |
|-------|----------|-------|----------|----------|------|
| TC-TRK-01 | View my complaints | Open My Complaints | List of own complaints | P0 | Positive |
| TC-TRK-02 | Search by number | Search "JM-2026-000123" | Matching complaint shown | P1 | Positive |
| TC-TRK-03 | Filter Active | Tap Active chip | Only active complaints | P1 | Positive |
| TC-TRK-04 | Realtime status update | Complaint status changes server-side | List/detail refreshes | P0 | Realtime |
| TC-TRK-05 | Add evidence | EVIDENCE_REQUIRED → upload → add_evidence | Images appended as round 2 | P0 | Positive |
| TC-TRK-06 | Add evidence non-owner | Other citizen tries add_evidence | Denied (server-side) | P0 | Security |
| TC-TRK-07 | Delete pre-verification | Delete SUBMITTED complaint | Complaint + images deleted | P1 | Positive |
| TC-TRK-08 | Delete verified | Delete VERIFIED complaint | Delete disabled | P1 | Negative |

## Map

| TC-ID | Scenario | Steps | Expected | Priority | Type |
|-------|----------|-------|----------|----------|------|
| TC-MAP-01 | Nearby markers | Open map → GPS | Markers within radius | P0 | Positive |
| TC-MAP-02 | Heatmap toggle | Toggle heatmap | Heatmap renders | P1 | Positive |
| TC-MAP-03 | Radius change | Select 5km | Markers within 5km | P1 | Positive |
| TC-MAP-04 | Filter by category | Select Pothole | Only pothole markers | P1 | Positive |
| TC-MAP-05 | Marker tap | Tap marker | Detail sheet → View Details | P0 | Positive |
| TC-MAP-06 | GPS denied | Deny location | Map usable manually | P1 | Permission |
| TC-MAP-07 | Realtime new complaint | New complaint filed nearby | Marker appears | P0 | Realtime |
| TC-MAP-08 | Privacy-safe nearby | Query nearby | No user_id, truncated description | P0 | Privacy |

## Gamification

| TC-ID | Scenario | Steps | Expected | Priority | Type |
|-------|----------|-------|----------|----------|------|
| TC-GAM-01 | Valid report +50 | Create complaint | rewards row +50, points updated | P0 | Positive |
| TC-GAM-02 | Verified +100 | Status→VERIFIED | +100 points | P0 | Positive |
| TC-GAM-03 | Resolved +25 | Status→RESOLVED | +25 points | P0 | Positive |
| TC-GAM-04 | Rejected -50 | Status→REJECTED | -50 points | P0 | Negative |
| TC-GAM-05 | Idempotent award | Same complaint+activity twice | One reward row | P0 | Concurrency |
| TC-GAM-06 | Badge auto-award | Reach reports count threshold | user_badges row + notification | P1 | Positive |
| TC-GAM-07 | Level up | Points cross threshold | level updated | P1 | Positive |
| TC-GAM-08 | Leaderboard privacy | privacy_show_leaderboard=false | Excluded from leaderboard | P0 | Privacy |
| TC-GAM-09 | Leaderboard no PII | Query leaderboard | No user ids/emails | P0 | Privacy |

## Safety

| TC-ID | Scenario | Steps | Expected | Priority | Type |
|-------|----------|-------|----------|----------|------|
| TC-SAF-01 | SOS trigger | Long-press + countdown | trigger_sos → incident ACTIVE | P0 | Positive |
| TC-SAF-02 | SOS cancel | Cancel | cancel_sos → CANCELLED | P0 | Positive |
| TC-SAF-03 | Live location | After SOS | share_location every 15s | P0 | Positive |
| TC-SAF-04 | SOS accidental | Short press | No trigger (countdown required) | P1 | Negative |
| TC-SAF-05 | 4th contact blocked | Add 4th | Blocked (max 3) | P1 | Boundary |
| TC-SAF-06 | Check-in complete | Create → "I'm safe" | complete_safety_checkin | P1 | Positive |
| TC-SAF-07 | Check-in miss → SOS | Let timer expire | Auto-trigger SOS | P0 | Positive |
| TC-SAF-08 | Nearby safe places | Open nearby | List of POLICE/HOSPITAL/SAFE_PLACE | P1 | Positive |
| TC-SAF-09 | Anonymous report | Submit message+location | submit_anonymous_report, no identity | P1 | Privacy |
| TC-SAF-10 | Admin acknowledge alert | Admin → acknowledge | alert acknowledged | P0 | Positive |

## Notifications

| TC-ID | Scenario | Steps | Expected | Priority | Type |
|-------|----------|-------|----------|----------|------|
| TC-NOT-01 | Status notification | Status changes | notifications row + push | P0 | Positive |
| TC-NOT-02 | Mark read | Tap notification | is_read=true (optimistic) | P0 | Positive |
| TC-NOT-03 | Mark read rollback | Network fails during mark read | Reverts to unread | P1 | Recovery |
| TC-NOT-04 | Push opt-out | notify_push=false | No push, in-app still works | P0 | Preference |
| TC-NOT-05 | Invalid token pruning | FCM returns not-registered | Token deleted from device_tokens | P1 | Maintenance |
| TC-NOT-06 | Client spoof attempt | Insert notification via API | Denied (no INSERT policy) | P0 | Security |

## AI Validation

| TC-ID | Scenario | Steps | Expected | Priority | Type |
|-------|----------|-------|----------|----------|------|
| TC-AI-01 | AI PASS | Edge fn returns PASS | AI_VERIFIED → VERIFIED | P0 | Positive |
| TC-AI-02 | AI REVIEW | Edge fn returns REVIEW | AI_REVIEW_REQUIRED → queue | P0 | Positive |
| TC-AI-03 | AI FAIL | Edge fn returns FAIL | AI_FAILED → EVIDENCE_REQUIRED | P0 | Positive |
| TC-AI-04 | AI error | Edge fn throws | Stuck → retry_stuck_ai_jobs | P0 | Recovery |
| TC-AI-05 | AI never silent reject | AI failure | Routes to human review, not REJECTED | P0 | Critical |
| TC-AI-06 | Officer verify override | Officer verifies AI-REVIEW | VERIFIED + audit | P0 | Positive |
| TC-AI-07 | Officer reject override | Officer rejects | REJECTED + audit | P0 | Positive |
| TC-AI-08 | Officer request evidence | Officer requests evidence | EVIDENCE_REQUIRED + message | P0 | Positive |

## Admin

| TC-ID | Scenario | Steps | Expected | Priority | Type |
|-------|----------|-------|----------|----------|------|
| TC-ADM-01 | Admin login | Email+password | Dashboard | P0 | Positive |
| TC-ADM-02 | Citizen can't admin | Citizen tries admin RPC | Denied (is_admin check) | P0 | Security |
| TC-ADM-03 | Change status valid | Allowed transition | Status updated + history | P0 | Positive |
| TC-ADM-04 | Change status invalid | Disallowed transition | Blocked | P0 | Negative |
| TC-ADM-05 | Assign complaint | Assign dept+officer | ASSIGNED + assignment record + notify | P0 | Positive |
| TC-ADM-06 | Assign closed | Assign CLOSED complaint | Blocked | P1 | Negative |
| TC-ADM-07 | Escalate | Escalate with reason | severity HIGH + history | P1 | Positive |
| TC-ADM-08 | Reopen | Reopen resolved | REOPENED + history + notify | P0 | Positive |
| TC-ADM-09 | Bulk delete | Select + reason | bulk_delete_complaints | P1 | Positive |
| TC-ADM-10 | Suspend citizen (non-system-admin) | Dept admin tries | Denied (SYSTEM_ADMIN only) | P0 | Security |
| TC-ADM-11 | SLA breach toast | Complaint breaches | Toast on dashboard | P1 | Positive |
| TC-ADM-12 | Dept admin scoped | Dept admin sees other dept | Denied/scoped | P0 | Security |

## Realtime

| TC-ID | Scenario | Steps | Expected | Priority | Type |
|-------|----------|-------|----------|----------|------|
| TC-RT-01 | Subscribe + receive | Subscribe to complaints | Event received | P0 | Positive |
| TC-RT-02 | Dedup | Duplicate event | Ignored (dedup set) | P1 | Concurrency |
| TC-RT-03 | Cleanup on dispose | Pop screen | Channel unsubscribed | P0 | Resource |
| TC-RT-04 | Reconnect | WebSocket drops | Auto-reconnect | P1 | Recovery |

## Database / RLS

| TC-ID | Scenario | Steps | Expected | Priority | Type |
|-------|----------|-------|----------|----------|------|
| TC-DB-01 | Citizen sees only own complaints | SELECT complaints as citizen A | Only A's complaints | P0 | Security |
| TC-DB-02 | No view-all complaints | SELECT * complaints | Only own (no policy for all) | P0 | Security |
| TC-DB-03 | Nearby privacy-safe | nearby_complaints | No user_id, truncated desc | P0 | Privacy |
| TC-DB-04 | Points trigger | UPDATE profiles.points via API | Rejected | P0 | Security |
| TC-DB-05 | Idempotent create | create_complaint twice same key | One complaint | P0 | Concurrency |
| TC-DB-06 | One verification per citizen | submit_community_verification twice | Second rejected | P0 | Validation |
| TC-DB-07 | Aadhaar hash | submit_aadhaar | sha256(digits) + masked stored | P0 | Privacy |
| TC-DB-08 | One account per email | Two profiles same email | Unique index blocks | P0 | Validation |
| TC-DB-09 | One account per phone | Two profiles same phone | Unique index blocks | P0 | Validation |

## Express Backend

| TC-ID | Scenario | Steps | Expected | Priority | Type |
|-------|----------|-------|----------|----------|------|
| TC-EXP-01 | Register | POST /auth/register | 201, user returned | P1 | Positive |
| TC-EXP-02 | Login | POST /auth/login | 200, JWT + cookie | P1 | Positive |
| TC-EXP-03 | Refresh rotation | POST /auth/refresh | New pair, old revoked | P1 | Positive |
| TC-EXP-04 | Citizen blocked from admin | GET /analytics as citizen | 403 | P1 | Security |
| TC-EXP-05 | Complaint lifecycle | create→under_review→in_progress→resolved→verified | Status transitions | P1 | Positive |
| TC-EXP-06 | SLA breach | GET /complaints/sla-breaches | Breached complaints | P1 | Positive |
| TC-EXP-07 | Nearby (raw SQL) | GET /complaints/nearby | Within radius, ordered | P1 | Positive |
| TC-EXP-08 | Rate limit auth | >20 auth req/window | 429 | P2 | Security |
