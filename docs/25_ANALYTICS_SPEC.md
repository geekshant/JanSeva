# JanMitra — Analytics Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Implementation status:** Implemented (admin frontend + Supabase RPCs + client-side computation).

---

## 1. Complaint Volume
- **Definition:** Total complaints in date range.
- **Source:** `get_analytics_summary` / `get_dashboard_complaints` / client-side count.
- **Display:** KPI card on Analytics Overview.

## 2. Complaint Categories
- **Definition:** Count per category.
- **Calculation:** `getByCategory()` (client-side groupBy from complaints + categories) or Express `GET /analytics/categories` (Prisma groupBy).
- **Display:** CategoryDistribution chart.

## 3. Status Distribution
- **Definition:** Count per complaint_status.
- **Calculation:** `getByStatus()` (client-side) or Express `GET /analytics/statuses`.
- **Display:** Recharts PieChart.

## 4. Resolution Time
- **Definition:** Average hours from `created_at` to `resolved_at` for resolved complaints.
- **Calculation:** `get_analytics_summary` (`avg_resolution_hours`) or Express `getAnalyticsSummary` (raw SQL `EXTRACT(EPOCH FROM (resolved_at - created_at))/3600`).
- **Display:** KPI card.

## 5. SLA Compliance
- **Definition:** `(on_track / total active) × 100`.
- **Related:** SLA breaches, due soon, at risk, escalated, resolved counts.
- **Calculation:** `get_analytics_summary` (`sla_summary: {overdue, dueSoon, onTrack}`) or Express `getAnalyticsSummary`.
- **Display:** KPI card + SLA summary section + SLA page.

## 6. SLA Breaches
- **Definition:** Active complaints where `sla_deadline < now()`.
- **Calculation:** Express `getBreachedComplaints`; admin `getSlaOverview`.
- **Display:** SLA Breached page + toast on count increase.

## 7. Department Performance
- **Definition:** Per-department total, open, resolved, overdue, avg resolution, officer count.
- **Calculation:** `get_department_analytics` RPC or Express `GET /analytics/departments`.
- **Display:** Department performance table.

## 8. Officer Workload
- **Definition:** Per-officer assigned, completed, SLA breaches, avg resolution.
- **Calculation:** Officer detail page (client-side from complaints by `assigned_officer_id`).
- **Display:** Officer detail.

## 9. Geographic Hotspots
- **Definition:** Top complaint density locations.
- **Calculation:** `get_hot_zones` RPC (PostGIS, lat/lng rounded to 3 decimals, count) or Express `GET /analytics/hot-zones` (raw SQL, top 25).
- **Display:** Dashboard map hot zones [admin: stubbed `useProdAiHotspots` returns []; hotspots not on production map].

## 10. Complaint Density
- **Definition:** Complaints per area (heatmap).
- **Calculation:** `nearby_complaints_heatmap` RPC (grid-based).
- **Display:** Map heatmap layer.

## 11. AI Validation Statistics
- **Definition:** total_analyzed, ai_verified, ai_failed, ai_review_required, ai_evidence_required, ai_success_rate, ai_analysis_pending, ai_analysis_error.
- **Calculation:** `get_ai_analytics` RPC; `get_ai_processing_stats()` (queued, processing, completed_today, failed, avg_processing_ms, p95_processing_ms).
- **Display:** AI analytics bar chart on Analytics Overview.

## 12. Evidence Issues
- **Definition:** Complaints in EVIDENCE_REQUIRED / AI_FAILED.
- **Calculation:** Client-side status count.
- **Display:** Admin complaint list (SLA filter, status filter).

## 13. Reopened Complaints
- **Definition:** Complaints with status REOPENED or `verification_status=reopened`.
- **Calculation:** `get_reopened_complaints` RPC.
- **Display:** Reopened Cases page + KPI.

## 14. Citizen Participation
- **Definition:** Active citizens (distinct reporters), reports per citizen, community verification participation.
- **Calculation:** `count_citizens` RPC (excludes officers); `get_citizen_stats`.
- **Display:** Civic health page; analytics KPIs.

## 15. Gamification Statistics
- **Definition:** Badges count, reward rules count, levels count, total points awarded, badge holders.
- **Calculation:** Gamification page (client-side from badges/reward_rules/level_config/rewards).
- **Display:** Gamification overview.

## 16. Safety Incidents
- **Definition:** Active/resolved SOS/safety incidents.
- **Calculation:** `get_active_safety_alerts` / `get_active_safety_alerts_count`.
- **Display:** Safety Alerts page.

## 17. Police Response
- **Definition:** Acknowledge/resolve times for safety alerts.
- **Calculation:** `safety_incidents` acknowledged_at/resolved_at [S].
- **Display:** Safety Alerts page.

## 18. Automation Performance
- **Definition:** Total/active/disabled rules, exec today/week, success rate, completed/failed/pending, avg duration, last success/failure; per-rule stats.
- **Calculation:** `automation_stats`, `get_automation_rules_with_stats`, `get_automation_execution_log`.
- **Display:** Automation Center.

## 19. Civic Health Score
- **Definition:** `resolution_rate × 0.6 + engagement_rate × 0.4`.
- **Calculation:** `getCivicHealth()` (client-side: count_citizens excluding officers; distinct user_ids; status counts).
- **Display:** Civic Health page.

## 20. Trends
- **Definition:** Daily submitted vs resolved time series.
- **Calculation:** `getTrends()` (client-side date bucketing from complaints) or Express `GET /analytics/trends` (`generate_series`).
- **Display:** TrendChart (line/area).

## 21. Ward Analytics
- **Definition:** Per-ward complaint counts.
- **Calculation:** `get_ward_analytics` RPC or distinct `complaints.ward`.
- **Display:** Analytics Wards page.
