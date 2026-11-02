# JanMitra — API/DB/Frontend Traceability Matrix

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Convention:** Maps Business Requirement → Functional Requirement → User Story → Use Case → UI Screen → API/RPC → Database Table → Test Case → Acceptance Criteria. **[GAP]** = missing implementation link.

---

| Business Req | Functional Req | User Story | Use Case | Screen (Mobile/Admin) | API / RPC | DB Table | Test Case | Status |
|--------------|----------------|-----------|----------|------------------------|-----------|----------|-----------|--------|
| Citizen registration | REQ-AUTH-01 | US-CIT-01 | UC-AUTH-01 | Mobile: Register | supabase.auth.signUp; handle_new_user trigger | auth.users, profiles | TC-AUTH-01..04 | ✅ |
| Phone login | REQ-AUTH-02 | US-CIT-02 | UC-AUTH-02 | Mobile: Login | resolve_phone_login RPC | profiles | TC-AUTH-05..08 | ✅ |
| Aadhaar KYC | REQ-AUTH-05 | US-CIT-03 | UC-AUTH-03 | Mobile: Aadhaar Registration | submit_aadhaar_registration RPC | aadhaar_kyc | TC-AUTH-11..13 | ✅ |
| Report complaint | REQ-CMP-01..06 | US-CIT-04/05 | UC-CMP-01 | Mobile: Report Issue (5-step) | create_complaint/join_similar_complaint RPC; find_similar_complaints RPC; ai-evidence-verification edge fn | complaints, complaint_images, complaint_images bucket | TC-REP-01..13 | ✅ (AI fn [S]) |
| Track complaint | REQ-CMP-11 | US-CIT-06 | UC-CMP-02 | Mobile: My Complaints + Detail | fetchRecentComplaints/fetchComplaintDetail | complaints + joins | TC-TRK-01..04 | ✅ |
| Add evidence | REQ-CMP-09 | US-CIT-07 | UC-CMP-03 | Mobile: Complaint Detail (add evidence) | add_evidence_to_complaint RPC | complaint_images | TC-TRK-05..06 | ✅ |
| Delete complaint | REQ-CMP-10 | US-CIT-08 | UC-CMP-04 | Mobile: Complaint Detail (delete) | DELETE complaints + storage | complaints, complaint_images | TC-TRK-07..08 | ✅ |
| Nearby/map | REQ-CMP-12/13, REQ-MAP-* | US-CIT-09 | UC-CMP-05 | Mobile: Map | nearby_complaints/nearby_complaints_heatmap RPC | complaints (PostGIS) | TC-MAP-01..08 | ✅ |
| Community verification | REQ-CV-01/02 | US-CIT-10 | UC-CV-01 | Mobile: Community Verification | verifiable_complaints/submit_community_verification RPC | community_verifications, resolution_evidence | (CV tests) | ✅ |
| Gamification points | REQ-GAM-01..04/07 | US-CIT-11 | UC-GAM-01 | Mobile: Rewards | get_reputation_summary RPC; award_points (service) | rewards, reward_rules, level_config, profiles, user_badges, badges | TC-GAM-01..05 | ✅ |
| Leaderboard | REQ-GAM-05 | US-CIT-12 | UC-GAM-02 | Mobile: Leaderboard | community_leaderboard RPC | profiles (privacy-safe) | TC-GAM-08..09 | ✅ |
| Badges | REQ-GAM-04 | US-CIT-11 | UC-GAM-01 | Mobile: Badges | check_and_award_badges (service) | badges, user_badges | TC-GAM-06 | ✅ |
| SOS | REQ-SAF-01 | US-CIT-13 | UC-SAF-01 | Mobile: Safety | trigger_sos/cancel_sos/share_location RPC | safety_incidents [S] | TC-SAF-01..04 | ✅ (tables [S]) |
| Trusted contacts | REQ-SAF-02 | US-CIT-14 | — | Mobile: Safety Contacts | fetch/add/update/delete_safety_contact RPC | safety_contacts [S] | TC-SAF-05 | ✅ (tables [S]) |
| Safety check-in | REQ-SAF-03 | US-CIT-15 | UC-SAF-02 | Mobile: Safety Check-in | create/complete_safety_checkin RPC | safety_checkins [S] | TC-SAF-06..07 | ✅ (tables [S]) |
| Nearby safe places | REQ-SAF-04 | US-CIT-16 | — | Mobile: Nearby Safe Places | find_nearby_safety_places RPC | safe_places [S] | TC-SAF-08 | ✅ (tables [S]) |
| Anonymous report | REQ-SAF-05 | US-CIT-17 | — | Mobile: Anonymous Report | submit_anonymous_report RPC | anonymous_reports [S] | TC-SAF-09 | ✅ (tables [S]) |
| Notifications | REQ-NOT-01..06 | US-CIT-18 | UC-NOT-01/02 | Mobile: Notifications | notifications SELECT/UPDATE; device_tokens; send-push-notifications edge fn | notifications, device_tokens | TC-NOT-01..06 | ✅ |
| Privacy | REQ-PRO-04 | US-CIT-19 | UC-PRO-02 | Mobile: Privacy Settings | upsert_user_settings/upsert_notification_preference/request_account_deletion/clear_location_history RPC; download-my-data edge fn | user_settings [S], notification_preferences [S] | (privacy tests) | ✅ (tables [S]) |
| Accessibility | REQ-PRO-05 | US-CIT-20 | — | Mobile: Privacy Settings (accessibility) | upsert_user_settings RPC | user_settings [S] | (accessibility tests) | ✅ (tables [S]) |
| Admin login | REQ-AUTH-08 | US-ADM-01 | UC-AUTH-04 | Admin: Login | supabase.auth.signInWithPassword | auth.users | TC-ADM-01..02 | ✅ |
| Dashboard | REQ-ANL-01 | US-ADM-02 | UC-ANL-01 | Admin: Dashboard | get_dashboard_complaints RPC | complaints + joins | (dashboard tests) | ✅ |
| Complaints mgmt | (admin) | US-ADM-03..07 | UC-CMP-06..09 | Admin: Complaints + Detail | complaints SELECT/UPDATE; complaint_status_history; manual_assign_complaint; reopen_complaint; bulk_delete_complaints RPC | complaints, complaint_status_history, complaint_assignments [S] | TC-ADM-03..09 | ✅ (assign [S]) |
| AI review | REQ-AI-03/04 | US-ADM-03 | UC-AI-02 | Admin: AI Review Queue + Detail AI panel | get_complaints_for_ai_review/get_ai_verification/officer_review_complaint RPC | complaint_ai_verification [S] | TC-AI-06..08 | ✅ (table [S]) |
| Reopened | (admin) | US-ADM-07 | UC-CMP-09 | Admin: Reopened Cases | get_reopened_complaints RPC | complaints (verification_status) | (reopened tests) | ✅ |
| Civic map | REQ-MAP-04 | — | UC-CMP-05 | Admin: Civic Map | get_map_complaints/get_map_complaints_count RPC | complaints (PostGIS) | (map tests) | ✅ |
| Incidents | (admin) | — | UC-INC-01 | Admin: Incidents + Detail | civic_incidents/duplicate_links CRUD; find_nearby_complaints RPC | civic_incidents [S], duplicate_links [S] | (incident tests) | ✅ (tables [S]) |
| SLA mgmt | REQ-SLA-01..04 | US-ADM-10 | UC-SLA-01/02 | Admin: SLA + Rules + Breached + Escalations | getSlaOverview/getBreachedComplaints; sla_rules CRUD | complaints.sla_deadline; sla_rules [S] | (SLA tests) | Partial (no proactive warning) |
| Departments | REQ-DEP-01/02 | US-ADM-08 | UC-DEP-01 | Admin: Departments + Detail | departments CRUD | departments [S] | (dept tests) | ✅ (table [S]) |
| Officers | REQ-DEP-03 | US-ADM-09 | UC-DEP-02 | Admin: Officers + Detail | officers CRUD | officers [S], profiles | (officer tests) | ✅ (table [S]) |
| Citizens | (admin) | US-ADM-11 | — | Admin: Citizens + Detail | list_citizens/count_citizens/get_citizen_stats RPC; suspend/restore | profiles | TC-ADM-10/12 | ✅ |
| Gamification config | (admin) | US-SYS-03 | — | Admin: Badges + Reward Rules + Leaderboard | badges/reward_rules CRUD; get_leaderboard RPC | badges, reward_rules, level_config | (gamification config tests) | ✅ |
| Analytics | REQ-ANL-01..08 | US-ADM-14 | UC-ANL-01 | Admin: Analytics (overview + sub) | get_analytics_summary/get_hot_zones/get_department_analytics/get_ward_analytics/get_ai_analytics RPC | complaints + joins | (analytics tests) | ✅ |
| Automation | REQ-AUT-01..03 | US-ADM-12 | UC-AUT-01 | Admin: Automation Center + Rules | automation_stats/get_automation_*/retry_automation_execution RPC; automation_rules CRUD | automation_rules [S], automation_executions [S], automation_audit_log [S] | (automation tests) | ✅ (tables [S], engine [S]) |
| Safety alerts | REQ-SAF-06/07 | US-ADM-13/US-POL-01 | UC-SAF-03 | Admin: Safety Alerts | get_active_safety_alerts/acknowledge_safety_alert/resolve_safety_incident RPC | safety_alerts [S], safety_incidents [S] | TC-SAF-10 | ✅ (tables [S], auto-dispatch [S]) |
| Settings | REQ-PRO/REQ-AI-07 | US-SYS-01/02 | — | Admin: Settings (Categories, Notification Config, AI Config, Roles, Demo) | categories CRUD; notification_config; category_ai_config; update_category_ai_config; is_demo_mode/toggle_demo_mode/seed_demo_complaints/advance_demo_complaints RPC | categories, notification_config [S], category_ai_config [S] | (settings tests) | ✅ |
| Audit logs | NFR-AUDIT-01 | US-ADM-15 | — | **[GAP]** No Audit Logs page | logAudit (catches 42P01); listAuditLogs (unused) | audit_logs [S] (not in repo) | (audit tests) | **[GAP]** |
| AI validation | REQ-AI-01..06 | — | UC-AI-01 | (edge function) | ai-evidence-verification edge fn [not in repo]; retry_stuck_ai_jobs RPC | complaint_ai_verification [S], system_config [S] | TC-AI-01..05 | ✅ (live) [S in repo] |
| Auto assignment | REQ-DEP-05 | — | — | (backend logic) | [S] | officers [S], departments [S] | (auto-assign tests) | **[GAP]** manual only |
| SLA warning | REQ-SLA-05 | — | — | — | (no background monitor) | — | — | **[GAP]** never sent |
| Express backend | (parallel) | — | — | (not wired to admin frontend) | 57 REST endpoints | admin.* tables + public.complaints (raw) | TC-EXP-01..08 | ✅ (parallel, disconnected) |

## Missing Implementation Links
1. **Audit Logs page** — no UI; `audit_logs` table not in repo SQL; `logAudit` swallows missing table.
2. **AI edge function source** — `ai-evidence-verification` not in `supabase/functions/`.
3. **Auto-assignment** — manual only; full jurisdiction/distance/workload logic not confirmed.
4. **SLA warning notifications** — `SLA_WARNING` type defined but never sent (no background monitor).
5. **Version-controlled schema** — officers, departments, AI, safety, automation, SLA, audit tables not in repo SQL (live only).
6. **Express ↔ admin frontend** — backend exists but admin frontend uses Supabase directly (disconnected).
7. **Admin frontend tests** — no test suite.
8. **`download-my-data` edge function** — referenced by mobile, not in repo.
