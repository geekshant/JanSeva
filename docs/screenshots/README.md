# Screenshots Guide

This directory holds UI screenshots referenced by the root `README.md`.
No screenshots currently exist in the repository — only default Flutter launcher
icons and favicons were found during inspection. This file lists **every
screenshot the README expects**, with the exact path and a description of what
each screenshot should show (derived from the actual source code).

## How to Capture

### Mobile (Flutter)
1. Run the app: `cd mobile && flutter run` (emulator or device).
2. Navigate to each screen listed below.
3. Capture a screenshot (Android: `adb exec-out screencap -p > <name>.png`;
   iOS: Xcode Devices → take screenshot).
4. Save to `docs/screenshots/mobile/<name>.png`.

### Admin Dashboard (React)
1. Run: `cd ADMIN/frontend && npm run dev` → open `http://localhost:5173`.
2. Log in with `admin@janmitra.demo` / `Demo@1234`.
3. Navigate to each page listed below.
4. Capture with OS screenshot tool. Save to `docs/screenshots/admin/<name>.png`.

## Expected Mobile Screenshots

| File | Screen | What to show |
|------|--------|--------------|
| `mobile/01_splash.png` | Splash | Branded gradient with fade+scale animation |
| `mobile/02_onboarding.png` | Onboarding | 3-page intro carousel |
| `mobile/03_login.png` | Login | Email/phone + password, show/hide, forgot/register links |
| `mobile/04_register.png` | Register | Name, email, phone, password + strength hints |
| `mobile/05_aadhaar.png` | Aadhaar KYC | Aadhaar field `XXXX XXXX XXXX`, consent checkbox, submit/skip |
| `mobile/06_home.png` | Home | Header, reputation card, quick actions, nearby preview, recent complaints, community snapshot |
| `mobile/07_report_category.png` | Report — Category | Grid of 10 category cards (with AI config) |
| `mobile/08_report_photos.png` | Report — Photos | 3-col grid, camera/gallery, per-photo status overlays, min 3 |
| `mobile/09_report_location.png` | Report — Location | flutter_map (Mapbox), GPS button, marker, Bhopal geofence |
| `mobile/10_report_details.png` | Report — Details | Title (maxLength 200), description, severity ChoiceChips |
| `mobile/11_report_review.png` | Report — Review | Summary + similar-complaints banner |
| `mobile/12_report_success.png` | Report Success | Animated check, complaint number, status badge, actual points |
| `mobile/13_my_complaints.png` | My Complaints | List, search, filter chips, sort, realtime |
| `mobile/14_complaint_detail.png` | Complaint Detail | Header, assignment, AI banner, evidence gallery, timeline, resolution evidence |
| `mobile/15_complaint_timeline.png` | Complaint Detail — Timeline | 6-step lifecycle timeline |
| `mobile/16_add_evidence.png` | Add Evidence | "Upload New Photos" flow when EVIDENCE_REQUIRED |
| `mobile/17_map.png` | Map | flutter_map, radius selector, markers, heatmap toggle, filters |
| `mobile/18_heatmap.png` | Heatmap | Gradient circle heatmap layer |
| `mobile/19_community_verification.png` | Community Verification | Before/after photos, confirm/dispute, mandatory photos |
| `mobile/20_rewards.png` | Rewards | Reputation summary card, badge grid, reward rules, contribution history |
| `mobile/21_leaderboard.png` | Leaderboard | Top-3 podium + full list, `is_me` highlight |
| `mobile/22_badges.png` | Badges | Full badge catalog (earned vs locked) |
| `mobile/23_safety.png` | Safety (main) | Pulsing red SOS button, quick actions grid, emergency 112 |
| `mobile/24_sos_active.png` | SOS Active | Status card, live location sharing, cancel |
| `mobile/25_safety_contacts.png` | Trusted Contacts | Max 3, add/edit dialogs |
| `mobile/26_safety_checkin.png` | Safety Check-in | Timer selector, countdown |
| `mobile/27_safety_nearby.png` | Nearby Safe Places | POLICE/HOSPITAL/SAFE_PLACE list, call + directions |
| `mobile/28_anonymous_report.png` | Anonymous Report | Message + optional location |
| `mobile/29_notifications.png` | Notifications | List, mark all read, unread badge, realtime |
| `mobile/30_profile.png` | Profile | Avatar, name, level, points, Aadhaar masked, menu |
| `mobile/31_edit_profile.png` | Edit Profile | Avatar upload, name, phone, city, ward |
| `mobile/32_preferences.png` | Preferences | 5 notification/privacy toggles |
| `mobile/33_privacy_settings.png` | Privacy Settings | 8 sections (visibility, location, Aadhaar, data & account) |
| `mobile/34_accessibility.png` | Accessibility | Font scale, high contrast, reduce motion, touch targets |

## Expected Admin Screenshots

| File | Page | What to show |
|------|------|--------------|
| `admin/01_login.png` | Login | Email + password, demo account cards |
| `admin/02_dashboard.png` | Dashboard | KPI row, interactive Mapbox map, complaint list, AI insights |
| `admin/03_dashboard_map.png` | Dashboard — Map | Markers/heatmap/clustering on Mapbox GL |
| `admin/04_complaints.png` | Complaints List | Paginated table, filters, bulk actions |
| `admin/05_complaint_detail.png` | Complaint Detail | Timeline, AI panel, assignment, evidence, community verification |
| `admin/06_ai_panel.png` | AI Verification Panel | AI metrics + evidence images, verify/reject/request-evidence |
| `admin/07_ai_review_queue.png` | AI Review Queue | Table of flagged complaints |
| `admin/08_reopened.png` | Reopened Cases | Reopened complaints table |
| `admin/09_civic_map.png` | Civic Map | Full-screen Mapbox split view + side list |
| `admin/10_incidents.png` | Incidents | Civic incidents table, create dialog |
| `admin/11_incident_detail.png` | Incident Detail | Linked complaints, photos, stats, merge |
| `admin/12_sla.png` | SLA Management | 6 KPI cards, lifecycle, 3 tables with countdowns |
| `admin/13_sla_rules.png` | SLA Rules | CRUD table |
| `admin/14_departments.png` | Departments | CRUD table, create/edit dialog |
| `admin/15_department_detail.png` | Department Detail | Stats, recent complaints, SLA rules |
| `admin/16_officers.png` | Officers | CRUD table, department/role filter |
| `admin/17_officer_detail.png` | Officer Detail | Stats, recent complaints |
| `admin/18_citizens.png` | Citizens | Paginated list, suspend/restore |
| `admin/19_citizen_detail.png` | Citizen Detail | Stats, badges, rewards, complaints |
| `admin/20_gamification.png` | Gamification | Overview stats, level config |
| `admin/21_badges.png` | Badges | CRUD + holders count |
| `admin/22_reward_rules.png` | Reward Rules | CRUD table |
| `admin/23_leaderboard.png` | Leaderboard | Scope/ward filters, top citizens |
| `admin/24_analytics.png` | Analytics Overview | KPIs, trend chart, category distribution, status pie, AI analytics |
| `admin/25_analytics_civic_health.png` | Civic Health | Resolution + engagement score |
| `admin/26_automation.png` | Automation Center | Engine status, 12 health stats, 8 complaint stats, activity feed, rules table, execution log |
| `admin/27_automation_rules.png` | Automation Rules | Enable/disable, edit |
| `admin/28_safety_alerts.png` | Safety Alerts | Flashing banner, alert cards, acknowledge/resolve, buzzer |
| `admin/29_notifications.png` | Notifications | Admin inbox |
| `admin/30_settings.png` | Settings | Hub with config links, demo mode |
| `admin/31_categories.png` | Categories Settings | CRUD |
| `admin/32_ai_config.png` | AI Verification Settings | Per-category AI config |
| `admin/33_roles.png` | Roles & Permissions | Read-only matrix |

> Once you capture and save the PNGs to the paths above, the root `README.md`
> image references will render automatically.
