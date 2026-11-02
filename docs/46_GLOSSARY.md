# JanMitra — Project Glossary

> **Document version:** 1.0  
> **Generated:** 2026-09-30

| Term | Definition |
|------|-----------|
| **Aadhaar KYC** | Identity verification using India's Aadhaar number; JanMitra stores only a SHA-256 digest + masked form, never raw. |
| **AI Decision** | The AI edge function's verdict on evidence: PASS, REVIEW, or FAIL. FAIL requests more evidence; never auto-rejects. |
| **AI Review Queue** | Admin page listing complaints flagged `AI_REVIEW_REQUIRED` for human review. |
| **Anonymous Report** | Safety report with no attached citizen identity (`submit_anonymous_report` RPC). |
| **Assignment** | Linking a verified complaint to a department and/or officer (`manual_assign_complaint`). |
| **Audit Log** | Record of who/what/when for sensitive actions. `audit_logs` table [S]; `complaint_status_history` + `rewards` are fully implemented audit trails. |
| **Badge** | Achievement awarded when criteria met (`check_and_award_badges`); e.g., First Report, Civic Champion. |
| **Bhopal Geofence** | Hardcoded location bounds (lat 23.10–23.40, lng 77.25–77.55) restricting complaint locations to Bhopal. |
| **Category** | Civic issue type (Pothole, Garbage/Sanitation, etc.); 10 seeded. |
| **Civic Incident** | A group of duplicate/related complaints (`civic_incidents` + `duplicate_links`). |
| **Civic Health Score** | `resolution_rate × 0.6 + engagement_rate × 0.4`. |
| **Complaint** | A filed civic issue with photo(s) + location + category + severity. |
| **Complaint Number** | Human-readable ID `JM-YYYY-NNNNNN` (`generate_complaint_number`). |
| **Complaint Status** | Lifecycle state (SUBMITTED → ... → CLOSED). Repo enum has 6 values; live has ~19. |
| **Community Verification** | Nearby citizens confirm/dispute a resolved complaint (`submit_community_verification`). |
| **Department** | Municipal department (Roads, Sanitation, Safety) mapped to categories. |
| **Device Token** | FCM registration token per device for push delivery (`device_tokens`). |
| **Edge Function** | Supabase Deno serverless function (e.g., `send-push-notifications`). |
| **Evidence** | Photos attached to a complaint (`complaint_images`) or resolution (`resolution_evidence`). |
| **Evidence Required** | Status indicating more evidence is needed (EVIDENCE_REQUIRED). |
| **FCM** | Firebase Cloud Messaging (push notification delivery). |
| **Gamification** | Points + badges + levels + leaderboard rewarding civic participation. |
| **Geofence** | Geographic boundary restricting actions (Bhopal for complaints). |
| **Heatmap** | Density visualization of complaints (`nearby_complaints_heatmap`). |
| **Idempotency Key** | Token preventing duplicate complaint creation (`create_complaint`/`join_similar_complaint`). |
| **Jurisdiction** | Geographic area a department/officer covers [S]. |
| **Leaderboard** | Ranked citizens by points (`community_leaderboard`, privacy-safe). |
| **Level** | Civic reputation tier (1–5, from `level_config`). |
| **Mapbox** | Map tile provider used by both apps (NOT Google Maps). |
| **Nearby Complaints** | Complaints within a radius of a point (`nearby_complaints` RPC, privacy-safe). |
| **Officer** | Municipal field worker (`officers` [S] joined to `profiles`). |
| **Outbox Pattern** | `notifications.push_sent=false` flag drained by edge function for FCM delivery. |
| **PostGIS** | Postgres geospatial extension for location queries. |
| **pg_trgm** | Postgres trigram extension for title similarity (duplicate detection). |
| **pg_cron** | Postgres cron scheduler (AI retry, push outbox). |
| **pg_net** | Postgres HTTP client extension (edge function invocation from SQL). |
| **Points** | Civic reputation currency (server-controlled via `award_points`). |
| **Realtime** | Supabase postgres_changes over WebSocket for live updates. |
| **Reputation** | Points + level + badges representing civic contribution. |
| **Resolution Evidence** | "After" photos uploaded by officer (`resolution_evidence`). |
| **RLS** | Row Level Security (Postgres) — per-row access control. |
| **RPC** | Remote Procedure Call (PostgREST function) e.g., `create_complaint`. |
| **SOS** | Emergency signal triggering live location sharing to trusted contacts + responders. |
| **SLA** | Service Level Agreement — deadline for resolution (`sla_deadline`, `sla_rules` [S]). |
| **SLA States** | on_track, due_soon, at_risk, breached, escalated, resolved. |
| **Status History** | Audit trail of status changes (`complaint_status_history`, trigger-driven). |
| **Severity** | LOW / MEDIUM / HIGH / CRITICAL (`complaint_severity` enum). |
| **Supabase** | Backend platform (Postgres + Auth + Storage + Realtime + Edge Functions). |
| **Trusted Contact** | Person notified during SOS (max 3, `safety_contacts` [S]). |
| **Verification Status** | Community verification sub-state: pending/confirmed/reopened/needs_review. |
| **Ward** | Municipal ward subdivision. |
