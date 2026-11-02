# JanMitra — Admin Dashboard Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Stack:** React 18 + Vite 5 + TypeScript 5.6 + Tailwind 3.4 + shadcn/ui + TanStack Query 5 + Supabase JS + Mapbox GL JS + Recharts.

> All admin pages are **Implemented** unless noted. Auth: Supabase Auth + role from `app_metadata.role`. Data via Supabase RPCs + direct table queries (anon key, RLS-enforced).

---

## 1. Login (`/login`)
- **Purpose:** Staff authentication.
- **Data:** Email + password → `supabase.auth.signInWithPassword`.
- **Actions:** Login; demo account cards (System Admin, Department Admin, Officer — `Demo@1234`).
- **States:** Error inline; loading spinner.
- **Realtime:** None.

## 2. Dashboard (`/`)
- **Purpose:** Civic Command Center — KPIs + interactive map + complaint list + AI insights.
- **Data:** `get_dashboard_complaints` RPC; `categories`, `departments`, wards (distinct).
- **Actions:** Filters (status/severity/category/department/ward/date-preset), search, mode switch (markers/heatmap/both), clustering toggle, fit-all, click complaint → preview, click AI hotspot → evidence modal [stub: hotspots return []].
- **Realtime:** `useNewComplaintsRealtime` (complaints INSERT), `useActivityFeedRealtime` (history INSERT). Global invalidation.
- **States:** Error → ErrorState; loading overlay on map; empty; KPI skeletons.
- **Map center:** Bhopal (23.2597, 77.4126), zoom 12.

## 3. Complaints List (`/complaints`)
- **Purpose:** Paginated, filterable complaints table with bulk actions.
- **Data:** `listComplaints` (complaints joined with profiles, categories, complaint_images, complaint_ai_verification).
- **Actions:** View (→ detail), Assign (→ detail `?action=assign`), Change Status (dialog, role-filtered), Escalate (dialog), Add Note (dialog), Bulk Delete (dialog with reason → `bulk_delete_complaints`).
- **Filters:** search, status, severity, categoryId, SLA (all/on_track/due_soon/overdue/resolved), sort (newest/oldest/priority/sla), dateFrom, dateTo, page — all in URL search params.
- **Realtime:** `useComplaintsRealtime` → invalidates complaints/dashboard/analytics/sla/map.
- **States:** Error → ErrorState+retry; loading → skeletons; pagination.

## 4. Complaint Detail (`/complaints/:id`)
- **Purpose:** Full complaint view with workflow timeline, evidence, AI, assignment, status history, resolution evidence, community verification, automation history, incident linking.
- **Data:** `complaints` (joined), `complaint_status_history`, `complaint_images`, `complaint_ai_verification`, `resolution_evidence`, `community_verifications`, `automation_complaint_history` RPC, `civic_incidents`, `duplicate_links`.
- **Actions:** Change Status (role-filtered), Assign/Reassign (`manual_assign_complaint`), Add Note, Escalate, Link/Unlink Civic Incident, AI Verification Panel (verify/reject/request-evidence via `officer_review_complaint`), Reopen (`reopen_complaint`).
- **Realtime:** `useComplaintDetailRealtime`, `useComplaintHistoryRealtime`, `useComplaintImagesRealtime` (per-complaint filtered).
- **States:** Loading skeletons; error; not found; AI panel only when status ∈ AI_*.

## 5. AI Review Queue (`/complaints/ai-review`)
- **Purpose:** Queue of AI-flagged complaints.
- **Data:** `get_complaints_for_ai_review` (limit 200); badge via `get_ai_review_queue_count`.
- **Filters:** RPC-driven (none on page).
- **Realtime:** Sidebar badge via `useNavCounts`.
- **States:** Error; loading; empty ("All caught up").

## 6. Reopened Cases (`/complaints/reopened`)
- **Purpose:** Reopened complaints.
- **Data:** `get_reopened_complaints` (limit 200); badge via `get_reopened_complaints_count`.
- **Realtime:** `useNavCounts`.
- **States:** Error; loading; empty.

## 7. Civic Map (`/map`)
- **Purpose:** Full-screen split-view map + side list.
- **Data:** `get_map_complaints` (viewport-bounded PostGIS) + `get_map_complaints_count`; `categories`, `departments`, wards.
- **Actions:** Filters (status, severity, category, department, ward, SLA, date, dataSource), mode (markers/heatmap/both), clustering toggle, list panel toggle, mobile filter drawer.
- **Realtime:** Global (invalidates ['map']).
- **States:** Loading overlay; error overlay; empty overlay.

## 8. Incidents (`/incidents`)
- **Purpose:** Civic incidents (groups of duplicate complaints).
- **Data:** `civic_incidents` + `duplicate_links` via `listIncidents`.
- **Actions:** Create incident (dialog: title, description, category, severity, address, ward); row → detail.
- **Filters:** search, status, category.
- **Realtime:** Global (civic_incidents + duplicate_links).
- **States:** Error; loading skeletons; empty.

## 9. Incident Detail (`/incidents/:id`)
- **Purpose:** Single incident with linked complaints, photos, stats, merge.
- **Actions:** `markAsDuplicate`, `mergeIncidents`, `linkComplaintToIncident`, `unlinkComplaintFromIncident`, `find_nearby_complaints` (graceful failure).

## 10. SLA Management (`/sla`)
- **Purpose:** SLA overview.
- **Data:** `getSlaOverview` (active complaints + resolved counts), `getBreachedComplaints`, `getAtRiskComplaints`, `getDueSoonComplaints`.
- **Actions:** Escalate from breached tables.
- **Realtime:** `useSlaRealtime`.
- **States:** Loading; error. KPIs: on_track, due_soon, at_risk, breached, escalated, resolved. Live countdowns.

## 11. SLA Rules (`/sla/rules`)
- **Purpose:** CRUD SLA rules.
- **Data:** `sla_rules` — `listSlaRules`, `createSlaRule`, `updateSlaRule`, `deleteSlaRule`.
- **Fields:** category/department/severity, deadline_hours, warning_hours, critical_hours, active.
- **States:** Standard + create/edit dialog.

## 12. SLA Breached (`/sla/breached`)
- **Purpose:** Detailed breached list (non-high severity).

## 13. SLA Escalations (`/sla/escalations`)
- **Purpose:** Detailed escalated list (high/critical severity).

## 14. Departments (`/departments`)
- **Purpose:** Department CRUD.
- **Data:** `departments` — `listDepartments`, `createDepartment`, `updateDepartment`, `deactivateDepartment`.
- **Actions:** Create/Edit dialog (name, code, service area), deactivate (refuse if in use).
- **Filters:** search, active/inactive.
- **Realtime:** `useDepartmentsRealtime`.
- **States:** Loading; error; empty with create CTA.

## 15. Department Detail (`/departments/:id`)
- **Purpose:** Stats (active/resolved complaints, SLA breaches, avg resolution, officer count), recent complaints, SLA rules.

## 16. Officers (`/officers`)
- **Purpose:** Officer CRUD.
- **Data:** `officers` joined with `profiles` + `departments` — `listOfficers`, `createOfficer`, `updateOfficer`, `deactivateOfficer`.
- **Actions:** Create/Edit dialog (avatar+name+title, department, role, status), deactivate.
- **Filters:** search, department, role.
- **Realtime:** `useOfficersRealtime`.
- **States:** Loading; error; empty.

## 17. Officer Detail (`/officers/:id`)
- **Purpose:** Stats (assigned, completed, SLA breaches, avg resolution), recent complaints.

## 18. Citizens (`/citizens`)
- **Purpose:** Citizen profile list.
- **Data:** `list_citizens` RPC (paginated, search), `count_citizens`.
- **Actions:** Suspend/Restore (`suspendCitizen`/`restoreCitizen` → profiles update + audit). SYSTEM_ADMIN only.
- **Filters:** search, suspended-only.
- **States:** Error; loading (pulse placeholders); empty; Suspend dialog (reason).

## 19. Citizen Detail (`/citizens/:id`)
- **Purpose:** Stats (total/verified/resolved/rejected complaints, badges, rewards, points), badges list, rewards history, recent complaints.
- **Data:** `get_citizen_stats` RPC, `profiles`, `user_badges`, `rewards`, `complaints`.

## 20. Gamification (`/gamification`)
- **Purpose:** Overview — badges count, reward rules count, levels count, total points awarded; quick links; level config preview; security notice.

## 21. Badges (`/gamification/badges`)
- **Purpose:** Badge CRUD + count holders.
- **Data:** `badges` — `listBadges`, `createBadge`, `updateBadge`; `user_badges` — `countBadgeHolders`.

## 22. Reward Rules (`/gamification/rewards`)
- **Purpose:** Reward rule CRUD.
- **Data:** `reward_rules` — `listRewardRules`, `createRewardRule`, `updateRewardRule`.

## 23. Leaderboard (`/gamification/leaderboard`)
- **Purpose:** Citizen leaderboard.
- **Data:** `get_leaderboard` RPC (scope all_time/monthly, ward filter).

## 24. Civic Missions (`/civic-missions`)
- **Purpose:** Engagement overview (active citizens, badges, reward rules, resolution rate, top citizens, active rules, level progression). Read-only aggregate.

## 25. Analytics Overview (`/analytics`)
- **Purpose:** KPIs, trend chart, category distribution, status breakdown, AI analytics, SLA summary, department performance.
- **Data:** `get_analytics_summary`, `get_ai_analytics`, `get_department_analytics`, client-side bucketing.
- **Charts:** Recharts PieChart, BarChart, custom TrendChart, CategoryDistribution.
- **Date range:** 7/30/90 days.
- **States:** Partial-failure InlineError per section.

## 26–30. Analytics Sub-pages
`/analytics/complaints`, `/analytics/resolution`, `/analytics/departments`, `/analytics/wards`, `/analytics/civic-health` (civic health = resolution_rate × 0.6 + engagement_rate × 0.4).

## 31. Automation Center (`/automation`)
- **Purpose:** Engine monitoring.
- **Data:** `automation_stats`, `get_automation_rules_with_stats`, `get_automation_execution_log`, `get_failed_automations`, `retry_automation_execution`, `automation_audit_log`.
- **Realtime:** `useAutomationRealtime` (automation_audit_log + automation_executions).
- **States:** Permission-denied vs generic error; loading skeletons; empty.
- **Sections:** Engine status, 12 health stats, 8 complaint stats, recent activity feed, execution summary, rules table (per-rule stats), execution log (filterable), failed automations retry.

## 32. Automation Rules (`/automation/rules`)
- **Purpose:** Manage rules (enable/disable, edit priority/name/conditions).
- **Data:** `automation_rules` — `getAutomationRules`, `updateAutomationRule`, `toggleAutomationRule`.

## 33. Notifications (`/notifications`)
- **Purpose:** Admin inbox.
- **Data:** `notifications` — `listNotifications`, `markNotificationRead`, `markAllNotificationsRead`.
- **Actions:** Mark read, mark all read, unread-only filter.
- **Realtime:** `useNotificationsRealtime(user?.id)`.
- **States:** Loading skeletons; error; empty (different for unread vs all).

## 34. Settings (`/settings`)
- **Purpose:** Settings hub. System config links, account card, display (theme toggle), demo mode (toggle, seed, advance), about, sign out.
- **Demo mode:** `is_demo_mode`, `toggle_demo_mode`, `seed_demo_complaints`, `advance_demo_complaints` (via `useDemoModeRunner`).

## 35. Categories Settings (`/settings/categories`)
- **Purpose:** Category CRUD (name, description, icon, active).
- **Data:** `categories` — `listCategories`, `createCategory`, `updateCategory`.

## 36. Notification Config (`/settings/notifications`)
- **Purpose:** Toggle in-app/push per event type.
- **Data:** `notification_config` — `listNotificationConfigs`, `updateNotificationConfig`.

## 37. Roles & Permissions (`/settings/roles`)
- **Purpose:** Read-only permission matrix (20 permissions × 3 roles) from `lib/workflow.ts`. No editing.

## 38. AI Verification Settings (`/settings/ai-verification`)
- **Purpose:** Per-category AI config.
- **Data:** `category_ai_config` (joined with `categories`) — `listCategoryAiConfigs`, `updateCategoryAiConfig`.
- **Fields:** requires_images, min/max images, different angles, ai_enabled, auto_pass, auto_fail, review_threshold, category_hints.

## 39. Safety Alerts (`/safety`)
- **Purpose:** Women safety SOS alert management.
- **Data:** `get_active_safety_alerts`, `acknowledge_safety_alert`, `resolve_safety_incident`, `get_safety_incident_location_shares`.
- **Actions:** Acknowledge, resolve, buzzer (test/mute/unmute).
- **Realtime:** `useSafetyRealtime` (safety_alerts INSERT/UPDATE, safety_incidents *) + 15s polling.
- **States:** Loading skeletons; error; empty; flashing banner; urgency levels (critical >10min, urgent, normal).

## 40. 404 (`*`)
- Compass icon, back to dashboard.

---

## Cross-cutting

### Loading / Empty / Error States
- `LoadingState` (centered spinner), `EmptyState` (icon+title+description+action), `ErrorState` (retry button), `ErrorBoundary` (top-level), skeletons.

### Realtime
- Global `useGlobalRealtime` in AppShell invalidates TanStack Query caches on all major table changes. `RealtimeContext` tracks WebSocket state; TopNav `RealtimeIndicator`.

### Alerts/Toasts
- `useSlaBreachAlerts` (toast.error on breach/escalation increase → `/sla/breached` or `/sla/escalations`).
- `useNewComplaintAlerts` (toast.success on new complaint → `/complaints/:id`, complaint chime buzzer).

### Audio Buzzer
- Web Audio API. `safety` = 10s two-tone siren (1000Hz↔600Hz). `complaint` = 2-beep chime. Global mute in TopNav. SOS buzzer on new active safety alert.

### Map
- Mapbox GL JS, `supercluster` clustering, markers/heatmap/both, viewport-bounded PostGIS queries.
