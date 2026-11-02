# JanMitra — Product Requirements Document (PRD)

> **Document version:** 1.0  
> **Generated:** 2026-09-30

---

## 1. Product Vision

Make civic complaint reporting effortless and municipal response transparent and
accountable, while rewarding civic participation and keeping citizens safe.

## 2. User Personas

### 2.1 Priya — Active Citizen (28, Bhopal)
Reports potholes and garbage on her daily commute. Wants to know the status and
feel her reports matter. Earns badges.

### 2.2 Ramesh — Municipal Officer (42, Roads dept)
Receives assignments on his admin dashboard, updates status, uploads resolution
photos. Wants clear prioritization and SLA visibility.

### 2.3 Anjali — Department Admin (38, Sanitation)
Manages officers and complaints in her department. Wants workload balance and
performance metrics.

### 2.4 Vikram — Municipal Admin / System Admin (45)
Oversees the whole platform: analytics, automation, departments, officers,
citizens, safety alerts, settings.

### 2.5 Meera — Safety-conscious citizen (24, college student)
Uses SOS, trusted contacts, safety check-in when travelling at night. Wants
nearby safe places and anonymous reporting.

## 3. User Problems

| Persona | Problem |
|---------|---------|
| Priya | "I report issues but never hear back." |
| Ramesh | "I don't know what to work on or how urgent it is." |
| Anjali | "I can't see which officers are overloaded." |
| Vikram | "I have no city-wide visibility or analytics." |
| Meera | "I feel unsafe and have no quick way to alert trusted people." |

## 4. Product Goals

1. Reduce time-to-report to < 1 minute.
2. Provide real-time status transparency to citizens.
3. Give officers prioritized, geo-located, photo-evidenced assignments.
4. Provide administrators city-wide analytics and automation.
5. Provide women-safety tooling with live location sharing.
6. Gamify participation to sustain engagement.

## 5. Product Principles

- **Citizen-first:** Every flow starts from the citizen's effort.
- **Evidence-based:** Photo + location are first-class.
- **Transparent:** Status is always visible.
- **Accountable:** SLA + department/officer assignment + audit trail.
- **Privacy-preserving:** Minimal data exposure; opt-outs.
- **Human-in-the-loop:** AI assists, never decides alone.

## 6. Feature Areas

| Area | Mobile | Admin |
|------|--------|-------|
| Auth & identity | Registration, login, Aadhaar KYC, preferences, privacy | Login, roles |
| Reporting | 5-step wizard, duplicate detection, join-similar | Complaints mgmt, AI review queue |
| Tracking | My complaints, detail, timeline, add evidence | Complaint detail, reopen, escalate |
| Map | Nearby, heatmap, markers, filters | Civic map, hot zones |
| Departments/Officers | — | CRUD, assignment, stats |
| SLA | SLA info on detail | SLA mgmt, rules, breaches, escalations |
| Gamification | Rewards, badges, leaderboard, history | Badges config, reward rules, leaderboard, levels |
| Safety | SOS, contacts, check-in, safe places, anonymous | Safety alerts, acknowledge/resolve |
| Notifications | In-app + push | Admin inbox |
| Community verification | Verify resolutions | Community verification panel, reopen |
| Analytics | Community snapshot | Full analytics suite |
| Automation | — | Automation center, rules |
| Incidents | (citizen count on detail) | Incidents CRUD, link/merge |
| Settings | Preferences, accessibility, i18n | Categories, notification config, AI config, roles, demo mode |

## 7. User Journeys

### 7.1 Citizen: Report → Track → Resolve → Verify
1. Priya opens app → Home.
2. Taps Report → picks Pothole → snaps 3 photos → GPS auto-locates (Bhopal) →
   adds title/description/severity → Review shows a similar complaint → she
   chooses to file a new one.
3. Success screen shows +50 points and complaint number `JM-2026-000123`.
4. She gets a push notification when verified, assigned, in-progress, resolved.
5. On resolution, she sees before/after photos; a nearby citizen verifies it.

### 7.2 Officer: Receive → Acknowledge → Resolve
1. Ramesh logs into admin → sees assigned complaint with SLA countdown.
2. Acknowledges → In Progress → uploads resolution photos → status Resolution
   Submitted → community verification opens.

### 7.3 Admin: Monitor → Escalate
1. Vikram opens Dashboard → sees KPIs and a hot zone on the map.
2. Opens SLA page → sees 3 breached complaints → escalates one.

### 7.4 Citizen: Safety
1. Meera long-presses SOS → 3-2-1 countdown → SOS triggered → live location
   shared every 15s → trusted contacts notified → she cancels when safe.

## 8. MVP (Phase 1)

- Registration + login (email/phone) + Aadhaar KYC.
- Report issue (5-step) + success.
- My complaints + detail + timeline.
- Nearby/map (markers).
- Gamification (points/badges/levels/leaderboard).
- Notifications (in-app + push).
- Admin: login, dashboard, complaints list/detail, status change, assign.
- Supabase backend (schema, RPCs, RLS, triggers).

## 9. Phase 2 — Verification & Municipal Workflow

- AI evidence validation (edge function + review queue + human override).
- Community verification (verify resolutions).
- Reopen cases.
- Civic incidents (duplicate grouping).
- SLA management + rules + breaches + escalations.
- Departments + officers CRUD + assignment.
- Citizens list + suspend/restore.

## 10. Phase 3 — AI, Automation, Safety, Analytics

- AI per-category config + analytics.
- Automation center + rules + execution log + retry.
- Safety alerts admin page + buzzer.
- Full analytics suite (complaints, resolution, departments, wards, civic health).
- Heatmap + hot zones.
- Privacy settings + data download + account deletion.
- Accessibility settings.

## 11. Future Roadmap

See `42_ROADMAP.md`. Highlights:
- Version-control the live schema (officers, departments, AI, safety, automation,
  SLA, audit tables).
- Implement automatic department/officer assignment by category + jurisdiction +
  workload.
- Implement SLA warning notifications (background monitor).
- Wire or deprecate the Express backend.
- Add offline-first mobile sync.
- SMS gateway.
- Multi-city rollout.

## 12. Success Metrics

| Metric | Target |
|--------|--------|
| Time to report | < 60s |
| Complaint verification rate | Track |
| Resolution rate | Track |
| Avg resolution time | Track |
| SLA compliance | Track |
| Citizen DAU/MAU | Track |
| Reports per active citizen | Track |
| Community verification participation | Track |
| Safety SOS response time | Track |

## 13. Product Analytics

Dashboard analytics: complaint volume, category distribution, status breakdown,
resolution time, SLA compliance/breaches, department performance, officer workload,
geographic hotspots, AI validation stats, reopened complaints, citizen
participation, gamification stats, safety incidents, automation performance. See
`25_ANALYTICS_SPEC.md`.

## 14. User Engagement & Civic Participation Metrics

- Active citizens (distinct reporters).
- Reports per citizen.
- Verification participation rate.
- Badge earners.
- Leaderboard movement.
- Civic health score.
