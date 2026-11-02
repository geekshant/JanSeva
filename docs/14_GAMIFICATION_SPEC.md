# JanMitra — Gamification Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Implementation status:** Fully Implemented (repo SQL `07_reputation.sql`,
> `08_reputation_api.sql`, `11_similarity_and_leaderboard.sql`, `16_profile_preferences.sql`).

---

## 1. Design Principle

All reward calculations are **server-controlled**. Clients can NEVER directly
write `points` or `level`. Enforced by:
- `protect_reputation_columns()` BEFORE INSERT/UPDATE trigger on `profiles` —
  rejects client writes unless GUC `janmitra.allow_reputation_write='on'`.
- `award_points()` is `SECURITY DEFINER` and **granted to `service_role` only**
  (revoked from anon/authenticated).
- `rewards` table has **no INSERT/UPDATE RLS policy** (default deny).
- `user_badges` has **no INSERT policy** (default deny; only
  `check_and_award_badges` writes).

## 2. Civic Points

### 2.1 Reward Rules (`reward_rules` — seeded)
| activity_type | title | points |
|---------------|-------|--------|
| VALID_ISSUE_REPORT | Valid issue report | +50 |
| VERIFIED_REPORT | Verified report | +100 |
| VOLUNTEER_ACTIVITY | Volunteer activity | +75 |
| ISSUE_RESOLVED | Issue resolved | +25 |
| DUPLICATE_OR_FAKE_REPORT | Duplicate/fake report | −50 |

Rules are configurable by admin (Reward Rules page). `active` flag gates them.

### 2.2 Awarding
`award_points(p_user_id, p_activity_type, p_complaint_id, p_note)`:
1. Read `reward_rules` for `activity_type` where `active=true`.
2. Idempotent: unique constraint `rewards_complaint_activity_uniq (complaint_id, activity_type)` prevents double-award for the same complaint+activity.
3. Set GUC `janmitra.allow_reputation_write='on'`.
4. Update `profiles.points` (can go negative — the `points >= 0` check was dropped in `07` to allow penalty totals) and recompute `level` from `level_config`.
5. Call `check_and_award_badges`.
6. Insert `rewards` row.
7. Notification trigger fires (`notify_reward_earned`).

### 2.3 Trigger-driven Awards
| Trigger | Function | Event | Award |
|---------|----------|-------|-------|
| `complaints_award_report_points` | `handle_complaint_report_points()` | complaint INSERT | +50 VALID_ISSUE_REPORT |
| `complaints_apply_status_rewards` | `apply_status_rewards()` | status→VERIFIED | +100 VERIFIED_REPORT |
| | | status→RESOLVED | +25 ISSUE_RESOLVED |
| | | status→REJECTED | −50 DUPLICATE_OR_FAKE_REPORT |

### 2.4 Volunteer Activity
`record_volunteer_activity(p_user_id, p_note)` — service_role only, wraps `award_points('VOLUNTEER_ACTIVITY')` +75. (Called by external automation/admin, not directly triggered.)

## 3. Levels (`level_config` — seeded)
| level | title | min_points |
|-------|-------|------------|
| 1 | Civic Starter | 0 |
| 2 | Active Citizen | 100 |
| 3 | Community Helper | 300 |
| 4 | Civic Contributor | 600 |
| 5 | Civic Champion | 1000 |

Level recomputed on every point change. `get_reputation_summary()` returns current level + progress to next + `is_max_level`.

## 4. Badges (`badges` + `user_badges`)
Final seeded set (after `05` + `07` cleanup):
| Badge | criteria (JSON) | icon |
|-------|-----------------|------|
| First Report | `{"metric":"reports","count":1}` | flag |
| Civic Watcher | `{"metric":"reports","count":5}` | visibility |
| Community Helper | `{"metric":"reports","count":10}` | groups |
| Problem Solver | `{"metric":"resolved","count":3}` | lightbulb |
| Civic Champion | `{"metric":"level","count":5}` | emoji_events |
| Trusted Citizen | `{"metric":"verified","count":3}` | verified |

`check_and_award_badges(p_user_id)` parses `criteria` JSON `{"metric": ..., "count": N}` (metrics: reports, valid_reports, verified, resolved, volunteer, points, level) and inserts `user_badges` when threshold met (unique per user+badge).

## 5. Leaderboard
`community_leaderboard(p_limit DEFAULT 50)` — SECURITY DEFINER, sql. Returns
`(rank, name, points, level, is_me)`. **Privacy-safe**: no user ids/emails.
Rewritten in `16` to `WHERE p.privacy_show_leaderboard` — citizens who opted out
are excluded. Granted to `authenticated`.

## 6. Reputation Summary
`get_reputation_summary()` — SECURITY DEFINER, plpgsql, stable. Returns
`{points, level, level_title, level_min_points, next_level, next_level_title,
next_level_min_points, points_to_next, progress_percent, is_max_level,
badge_count}`. Granted to `authenticated` + `service_role`.

## 7. Contribution History
`rewards` table (joined to `complaints` for complaint_number/title) lists point
transactions. `ContributionHistoryScreen` shows activity title (from
`reward_rules.title` or humanized activity_type), signed points, related complaint.

## 8. Transaction History
`rewards` rows are append-only audit of every point change: `user_id`,
`complaint_id`, `activity_type`, `points` (signed), `description`, `created_at`.

## 9. Anti-Abuse
- Clients cannot write points/level (trigger + RLS).
- Idempotent awarding prevents double-points.
- Duplicate/fake report penalty (−50) on REJECTED.
- Community verification can reopen (disputing false resolutions).
- Admin can suspend citizens (SYSTEM_ADMIN only).

## 10. Administrative Configuration
- Reward Rules page: CRUD `reward_rules` (activity_type, title, points, description, active).
- Badges page: CRUD `badges` (name, description, icon, criteria JSON, pointsThreshold). Count badge holders.
- Level config: read-only (gamification overview shows levels).
- Security notice displayed: "points are trigger-managed, read-only."

## 11. Report Success Screen
Shows **actual** awarded points from the `rewards` table (via `reportRewardProvider`
reading the VALID_ISSUE_REPORT row) — never hard-coded.
