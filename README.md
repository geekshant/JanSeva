<div align="center">

# 🏛️ JanMitra

### Gamified Civic Engagement Platform

*Smart Civic Complaint & Municipal Governance Platform for Bhopal*

[![Status](https://img.shields.io/badge/status-active-success.svg)](https://github.com)
[![Mobile](https://img.shields.io/badge/mobile-Flutter%203.x-blue.svg)](https://flutter.dev)
[![Admin](https://img.shields.io/badge/admin-React%2018%20%2B%20Vite%205-61dafb.svg)](https://react.dev)
[![Backend](https://img.shields.io/badge/backend-Supabase-3ECF8E.svg)](https://supabase.com)
[![Map](https://img.shields.io/badge/map-Mapbox-4264FB.svg)](https://mapbox.com)
[![License](https://img.shields.io/badge/license-proprietary-red.svg)](#license)

**Report · Track · Resolve · Reward · Stay Safe**

</div>

---

> 🟢 **Live Admin Dashboard running now** → open **http://localhost:5173**
> Login: `admin@janmitra.demo` · Password: `Demo@1234` (System Admin)
> Other roles: `dept@janmitra.demo` (Dept Admin), `officer@janmitra.demo` (Officer)
> Capture screenshots → save to [`docs/screenshots/admin/`](docs/screenshots/README.md) — they auto-render below.

---

## 📑 Table of Contents

- [🎯 What is JanMitra?](#-what-is-janmitra)
- [🏗️ System Architecture](#️-system-architecture)
- [💻 Technology Stack](#-technology-stack)
- [📁 Repository Structure](#-repository-structure)
- [🚀 Quick Start](#-quick-start)
- [📱 Citizen Mobile App](#-citizen-mobile-app)
- [🖥️ Admin Web Dashboard (LIVE)](#️-admin-web-dashboard-live)
  - [📸 Dashboard Screenshots](#-dashboard-screenshots)
- [🗄️ Backend & Database](#️-backend--database)
- [🔄 Complaint Lifecycle](#-complaint-lifecycle)
- [🤖 AI Evidence Validation](#-ai-evidence-validation)
- [🏆 Gamification](#-gamification)
- [🛡️ Women Safety](#️-women-safety)
- [🔔 Notifications & Realtime](#-notifications--realtime)
- [🔒 Security & Privacy](#-security--privacy)
- [📊 Analytics](#-analytics)
- [⚙️ Automation](#️-automation)
- [🧪 Testing](#-testing)
- [🚢 Deployment](#-deployment)
- [📚 Documentation Package](#-documentation-package)
- [⚠️ Known Issues](#️-known-issues)
- [🗺️ Roadmap](#️-roadmap)
- [🔐 License](#-license)

---

## 🎯 What is JanMitra?

JanMitra lets citizens **report hyper-local civic problems** (potholes, garbage,
broken streetlights, water leakage, unauthorized construction, stray animals,
public safety hazards) using **photographs + location**, track complaints
transparently through a **municipal workflow**, receive notifications, participate
in **community verification**, earn **civic reputation** (points, badges, levels),
and use **women-safety features** (SOS, trusted contacts, safety check-in, nearby
safe places, anonymous reporting). Municipal staff manage the workflow via an
admin web dashboard with **AI-assisted evidence validation**, **SLA monitoring**,
**department/officer assignment**, **analytics**, and **automation**.

<details>
<summary><b>📖 The Problem JanMitra Solves</b></summary>

**Before JanMitra:**
```
Citizen → phone call / paper register → lost → no feedback
Municipality → no photos, no geo-location, no SLA, no data
Result → distrust, slow resolution, no accountability
```

**With JanMitra:**
```
Citizen captures photo + location + category → files in < 1 minute
  → AI-assisted evidence validation (human-in-the-loop, never auto-reject)
  → Human verification → department determination → officer assignment
  → SLA-tracked resolution with evidence
  → Community verification of resolution
  → Resolved / Reopened → Gamification rewards
  → Citizen notified at every step
```

</details>

<details>
<summary><b>👥 Target Users</b></summary>

| User | Surface | Role |
|------|---------|------|
| 🧑 Citizen | Mobile app | Reporter, tracker, verifier, safety user |
| 👮 Officer | Admin dashboard | Field worker (acknowledge, resolve) |
| 🏢 Department Admin | Admin dashboard | Manage department workload |
| 🏛️ Municipal Admin | Admin dashboard | Full governance, analytics, automation |
| 🚓 Police / Safety Responder | Admin dashboard | Respond to SOS/safety alerts |

</details>

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Clients
        M["📱 Mobile App<br/>(Flutter · Android/iOS)"]
        A["🖥️ Admin Dashboard<br/>(React + Vite + TS)"]
    end
    subgraph Sup["Supabase Project (Postgres)"]
        PUB["public schema<br/>mobile + shared tables<br/>RLS · RPCs · triggers · Realtime"]
        ADM["admin schema<br/>(Express/Prisma — parallel, NOT wired)"]
    end
    EF["⚡ Edge Functions<br/>send-push-notifications ✅<br/>ai-evidence-verification [S]<br/>download-my-data [S]"]
    FCM["🔵 Firebase Cloud Messaging"]
    MBX["🗺️ Mapbox tiles"]

    M -->|supabase_flutter<br/>RPC · Realtime · Storage| PUB
    A -->|@supabase/supabase-js<br/>RPC · Realtime| PUB
    EF -->|service_role<br/>drains outbox| PUB
    EF --> FCM
    M --> MBX
    A --> MBX
    PUB -.->|raw SQL only<br/>schema mismatch| ADM

    style ADM stroke-dasharray: 5 5,stroke:#999
    style EF stroke:#f80,stroke-width:2px
```

<details>
<summary><b>⚠️ Critical Architecture Facts (read these first)</b></summary>

1. **Two backends exist, one is used.** The admin frontend uses **Supabase
   directly** (public schema, anon/publishable key, RPCs). A parallel
   **Express + Prisma backend** (`ADMIN/backend/`, separate `admin` schema, 57
   REST endpoints) exists but is **NOT wired to the admin frontend**.

2. **Live schema > repo schema.** Migrations `12`–`14` and both apps reference
   many tables (officers, departments, AI, safety, automation, SLA, audit) that
   are **NOT created in version-controlled SQL** — they exist only on the live
   Supabase project. These are labeled **[S]** (specified) throughout the docs.

3. **Mapbox, not Google Maps.** Both apps use Mapbox tiles. The original spec
   mentioned Google Maps; the actual implementation diverged (ADR-004).

4. **`complaint_status` enum mismatch.** Repo SQL defines 6 values
   (`SUBMITTED, VERIFIED, ASSIGNED, IN_PROGRESS, RESOLVED, REJECTED`). The live
   project + apps use ~19 (including `AI_CHECKING`, `AI_VERIFIED`,
   `AI_REVIEW_REQUIRED`, `AI_FAILED`, `EVIDENCE_REQUIRED`, `CLOSED`, `REOPENED`).

</details>

---

## 💻 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **📱 Mobile app** | Flutter · Dart | 3.x · 3.13+ |
| Mobile state | Riverpod | ^3.4.3 |
| Mobile routing | go_router | ^18.0.1 |
| Mobile backend client | supabase_flutter | ^2.17.2 |
| Mobile map | flutter_map (Mapbox raster) | ^8.3.2 |
| Mobile location | geolocator · geocoding | ^14 · ^5 |
| Mobile push | firebase_messaging · flutter_local_notifications | ^16.7 · ^22.3 |
| **🖥️ Admin frontend** | React · Vite · TypeScript | 18.3 · 5.4 · 5.6 |
| Admin UI | Tailwind CSS · shadcn/ui (Radix) | 3.4 |
| Admin data | TanStack Query | ^5.59 |
| Admin map | mapbox-gl · supercluster | ^3.31 · ^9.1 |
| Admin charts | Recharts | ^2.13 |
| **🗄️ Backend (primary)** | Supabase | Postgres 15+ |
| Postgres extensions | PostGIS · pg_trgm · pgcrypto · pg_net · pg_cron | — |
| **🗄️ Backend (parallel)** | Express · Prisma · Socket.IO · JWT | 4 · 5 · 4 · 9 |
| **🔔 Push** | Firebase Cloud Messaging (v1 via firebase-admin) | ^12 |
| **⚡ Edge Functions** | Supabase Deno | — |

---

## 📁 Repository Structure

```
JanMitra/
├── ADMIN/
│   ├── backend/              # Express + Prisma (parallel, admin schema) — NOT wired
│   │   ├── prisma/             #   schema.prisma (15 models), migrations/, seed.ts
│   │   ├── src/                #   modules/{auth,users,departments,complaints,...}
│   │   └── tests/              #   Vitest + Supertest (3 files)
│   └── frontend/             # 🖥️ React admin dashboard (PRIMARY admin surface)
│       └── src/
│           ├── pages/          #   ~40 pages
│           ├── components/     #   layout/, common/, complaints/, dashboard/, map/
│           ├── services/       #   Supabase service layer
│           ├── hooks/          #   TanStack Query + realtime
│           ├── contexts/       #   Auth, Realtime, Buzzer, Theme
│           └── lib/            #   supabase.ts, workflow.ts (RBAC)
├── database/                 # Supabase public-schema SQL (01–16 + full_setup)
├── mobile/                   # 📱 Flutter citizen app
│   └── lib/
│       ├── core/ · data/ · features/  # splash/auth/home/report/complaints/map/
│       │                              # verification/safety/gamification/notifications/profile
├── supabase/
│   └── functions/
│       └── send-push-notifications/index.ts   # only edge function in repo
├── docs/                     # 📚 48-file documentation package
│   └── screenshots/          # mobile/ + admin/ (add PNGs here)
└── README.md                 # this file
```

---

## 🚀 Quick Start

```bash
# 1. Supabase project — run database/01_schema.sql → 16 in SQL Editor
#    (or janmitra_full_setup.sql on a FRESH project only)
#    Auth > Email > Confirm email: OFF · Enable Realtime + add tables

# 2. 📱 Mobile app
cd mobile
flutter pub get
cp .env.example .env   # fill SUPABASE_URL, SUPABASE_ANON_KEY, MAPBOX_ACCESS_TOKEN, FIREBASE_*
flutter run

# 3. 🖥️ Admin dashboard (ALREADY RUNNING on http://localhost:5173)
cd ADMIN/frontend
npm install
cp .env.example .env   # fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_MAPBOX_ACCESS_TOKEN
npm run dev

# 4. (Optional) 🗄️ Admin backend
cd ADMIN/backend
npm install && cp .env.example .env  # fill DATABASE_URL, JWT_SECRET, CORS_ORIGINS, CLOUDINARY_*
docker compose up -d db && npx prisma migrate deploy && npm run dev
```

<details>
<summary><b>🔐 Demo Accounts</b></summary>

| Surface | Email | Password | Role |
|---------|-------|----------|------|
| 📱 Mobile | `aarav@janmitra.example` | `JanMitra123` | Citizen |
| 🖥️ Admin | `admin@janmitra.demo` | `Demo@1234` | System Admin |
| 🖥️ Admin | `dept@janmitra.demo` | `Demo@1234` | Department Admin |
| 🖥️ Admin | `officer@janmitra.demo` | `Demo@1234` | Officer |

> Note: database README lists `admin@janmitra.local` (stale); actual LoginPage
> uses `admin@janmitra.demo` (see KI-020).

</details>

> Full setup: [`docs/32_DEVELOPMENT_SETUP.md`](docs/32_DEVELOPMENT_SETUP.md)

---

## 📱 Citizen Mobile App

> All screens **Implemented** in Flutter source. Text wireframes below derive
> from the actual widget code. Screenshots: [`docs/screenshots/mobile/`](docs/screenshots/README.md)

<details>
<summary><b>🔓 Authentication (Splash · Onboarding · Login · Register · Aadhaar KYC)</b></summary>

**Login** — email OR phone + password; friendly error mapping.
```
┌─────────────────────────┐
│        JanMitra          │
│  ┌───────────────────┐   │
│  │ Email or Phone    │   │
│  └───────────────────┘   │
│  ┌───────────────────┐   │
│  │ Password    [👁]   │   │
│  └───────────────────┘   │
│  Forgot password?        │
│  ┌───────────────────┐   │
│  │      Sign In      │   │
│  └───────────────────┘   │
│  Don't have an account?  │
│  Register                │
└─────────────────────────┘
```
- **Register:** name, email, phone (10-digit), password (strength). `handle_new_user` trigger creates profile.
- **Aadhaar KYC** (optional): 12-digit formatted `XXXX XXXX XXXX` + consent → stores SHA-256 digest + masked only.

</details>

<details>
<summary><b>🏠 Home Dashboard</b></summary>

![Home](docs/screenshots/mobile/06_home.png)

```
┌─────────────────────────────────┐
│ 👤 Hi, Aarav    🔔3   📍Bhopal   │  ← HomeHeader
├─────────────────────────────────┤
│ ⚠️ 1 complaint needs evidence     │  ← EvidenceRequiredAlert
├─────────────────────────────────┤
│  Civic Reputation                 │
│  ━━━━━━━━━━━━━━━━━━━ 250 pts     │  ← CivicReputationCard
│  Level 2 · Active Citizen         │
│  ▓▓▓▓▓▓▓▓░░░░░░░ 50% → Lv 3      │
├─────────────────────────────────┤
│ [📋 Report] [🗂 My] [📍 Map]     │  ← QuickActions
│ [🏆 Rewards][🛡 Safety]          │
├─────────────────────────────────┤
│ Nearby Issues (within 2km)       │  ← NearbyPreviewSection
│  • Pothole near MP Nagar   HIGH   │
│  • Garbage pile E-7      MED     │
├─────────────────────────────────┤
│ Recent Complaints                │
│  JM-2026-000123 Pothole  VERIFIED │
├─────────────────────────────────┤
│ Community Snapshot               │
│  With location 142 · Resolved 87  │
├─────────────────────────────────┤
│ [Home][Complaints][🔔][Profile]  │  ← Bottom nav + Report FAB
└─────────────────────────────────┘
```
**Data:** `homeDashboardProvider` + `nearby_complaints` + `community_complaint_stats` RPCs. **Realtime:** `realtimeRefresherProvider`.

</details>

<details>
<summary><b>📋 Report Issue (5-Step Wizard)</b></summary>

![Report Category](docs/screenshots/mobile/07_report_category.png) ![Report Photos](docs/screenshots/mobile/08_report_photos.png)

```
Step 1 Category → Step 2 Photos (min 3, max 5) → Step 3 Location (Bhopal geofence)
  → Step 4 Details (title 3–200, description, severity) → Step 5 Review (similar detection)
  → Submit (idempotent) → fire ai-evidence-verification → Success (actual points from rewards table)
```
- **Duplicate detection:** `find_similar_complaints` (pg_trgm + PostGIS, 250m, ranked by title similarity).
- **Join similar:** `join_similar_complaint` files a linked complaint.
- **Idempotency:** `jm_<uid8>_<ts>_<hash>` key prevents duplicate creation.

</details>

<details>
<summary><b>🗂️ My Complaints · Complaint Detail · Timeline · Add Evidence</b></summary>

![Complaint Detail](docs/screenshots/mobile/14_complaint_detail.png) ![Timeline](docs/screenshots/mobile/15_complaint_timeline.png)

```
┌─────────────────────────────────┐
│ JM-2026-000123            [🗑]   │
│ Pothole near MP Nagar gate 2    │
│ [🟢 VERIFIED] [🔴 HIGH]         │
├─────────────────────────────────┤
│ Assignment: Roads · Ramesh       │
│ 🤖 AI Status: AI_VERIFIED         │
├─────────────────────────────────┤
│ Evidence (Round 1): [img][img][img] │
│ Evidence (Round 2): [img]            │
├─────────────────────────────────┤
│ Timeline: ● Submitted → ● Verified  │
│  → ● Assigned → ○ In Progress →     │
│  ○ Resolved → ○ Closed              │
└─────────────────────────────────┘
```
- **Add evidence** when EVIDENCE_REQUIRED/AI_FAILED → `add_evidence_to_complaint`.
- **Delete** only pre-verification statuses.

</details>

<details>
<summary><b>🗺️ Map · Heatmap · Community Verification</b></summary>

![Map](docs/screenshots/mobile/17_map.png) ![Heatmap](docs/screenshots/mobile/18_heatmap.png)

```
Nearby Issues   [500m ▼] [⚙]
┌─────────────────────────────┐
│   Mapbox tiles               │
│     🟢🟢  🔴  🟡  🟢🟠       │  ← markers by status
│       [📍 me]                 │
└─────────────────────────────┘
Mode: [Markers][Heatmap][Both]
```
- `nearby_complaints` + `nearby_complaints_heatmap` RPCs (PostGIS, privacy-safe: no user_id, truncated description).
- **Community Verification:** before/after photos → confirm/dispute with mandatory photos → `submit_community_verification`.

</details>

<details>
<summary><b>🏆 Gamification (Rewards · Leaderboard · Badges)</b></summary>

![Rewards](docs/screenshots/mobile/20_rewards.png) ![Leaderboard](docs/screenshots/mobile/21_leaderboard.png)

```
Civic Reputation · 250 pts · Level 2 Active Citizen · 50% → Lv 3
Badges (3/6): 🏁 First Report · 👁 Civic Watcher · 👥 Community Helper
              🔒 Problem Solver · 🏆 Civic Champion · 🔒 Trusted Citizen
Reward Rules: Valid +50 · Verified +100 · Volunteer +75 · Resolved +25 · Fake −50
Contribution History: +50 JM-..123 · +100 JM-..123 Verified
```
- All server-controlled (`award_points` service_role only; `protect_reputation_columns` trigger blocks client writes).
- Leaderboard privacy-safe (no user ids; respects `privacy_show_leaderboard`).

</details>

<details>
<summary><b>🛡️ Women Safety (SOS · Contacts · Check-in · Safe Places · Anonymous)</b></summary>

![Safety](docs/screenshots/mobile/23_safety.png) ![SOS Active](docs/screenshots/mobile/24_sos_active.png)

```
┌─────────────────────────────────┐
│        Women Safety               │
│      ┌──────────────────┐       │
│      │   ●●●  SOS  ●●●  │       │  ← pulsing red, long-press
│      │   (3-2-1 countdown)│      │
│      └──────────────────┘       │
│  [👥 Contacts][⏰ CheckIn]      │
│  [📍 Nearby][📝 Anonymous]      │
│  [📞 Emergency 112]              │
└─────────────────────────────────┘
```
- **SOS:** `trigger_sos` → live `share_location` every 15s → `cancel_sos`.
- **Trusted contacts:** max 3; CRUD RPCs.
- **Check-in:** 15/30/60/120 min → auto-SOS on miss.
- **Nearby safe places:** `find_nearby_safety_places` (POLICE/HOSPITAL/SAFE_PLACE).
- **Anonymous report:** `submit_anonymous_report` (no identity).

</details>

<details>
<summary><b>🔔 Notifications · 👤 Profile · 🔒 Privacy · ♿ Accessibility</b></summary>

- **Notifications:** list, mark read (optimistic), realtime, push (FCM).
- **Profile:** edit (whitelisted: name/phone/avatar/city/ward), preferences (5 toggles).
- **Privacy:** profile visibility, location precision (exact/block/ward/city), Aadhaar masking, data download, account deletion (30-day), logout all, clear location history.
- **Accessibility:** font scale, high contrast, reduce motion, screen reader hints, larger touch targets (persisted locally + server).
- **i18n:** English + Hindi. **Theme:** Material 3 light + dark.

</details>

> Full mobile spec: [`docs/23_MOBILE_APP_SPEC.md`](docs/23_MOBILE_APP_SPEC.md)

---

## 🖥️ Admin Web Dashboard (LIVE)

> 🟢 **Running now at http://localhost:5173** · Login: `admin@janmitra.demo` / `Demo@1234`
> Stack: React 18 + Vite 5 + TypeScript 5.6 + Tailwind 3.4 + shadcn/ui + TanStack Query 5 + Mapbox GL JS + Recharts
> All pages **Implemented**. Auth: Supabase Auth + role from `app_metadata.role`.

### Page Inventory (33 pages)

| # | Route | Page | Screenshot |
|---|-------|------|-----------|
| 1 | `/login` | Login | ![Login](docs/screenshots/admin/01_login.png) |
| 2 | `/` | Dashboard (Civic Command Center) | ![Dashboard](docs/screenshots/admin/02_dashboard.png) |
| 3 | `/complaints` | Complaints List | ![Complaints](docs/screenshots/admin/04_complaints.png) |
| 4 | `/complaints/:id` | Complaint Detail | ![Complaint Detail](docs/screenshots/admin/05_complaint_detail.png) |
| 5 | `/complaints/ai-review` | AI Review Queue | ![AI Review Queue](docs/screenshots/admin/07_ai_review_queue.png) |
| 6 | `/complaints/reopened` | Reopened Cases | ![Reopened](docs/screenshots/admin/08_reopened.png) |
| 7 | `/map` | Civic Map | ![Civic Map](docs/screenshots/admin/09_civic_map.png) |
| 8 | `/incidents` | Incidents | ![Incidents](docs/screenshots/admin/10_incidents.png) |
| 9 | `/incidents/:id` | Incident Detail | ![Incident Detail](docs/screenshots/admin/11_incident_detail.png) |
| 10 | `/sla` | SLA Management | ![SLA](docs/screenshots/admin/12_sla.png) |
| 11 | `/sla/rules` | SLA Rules | ![SLA Rules](docs/screenshots/admin/13_sla_rules.png) |
| 12 | `/departments` | Departments | ![Departments](docs/screenshots/admin/14_departments.png) |
| 13 | `/departments/:id` | Department Detail | ![Department Detail](docs/screenshots/admin/15_department_detail.png) |
| 14 | `/officers` | Officers | ![Officers](docs/screenshots/admin/16_officers.png) |
| 15 | `/officers/:id` | Officer Detail | ![Officer Detail](docs/screenshots/admin/17_officer_detail.png) |
| 16 | `/citizens` | Citizens | ![Citizens](docs/screenshots/admin/18_citizens.png) |
| 17 | `/citizens/:id` | Citizen Detail | ![Citizen Detail](docs/screenshots/admin/19_citizen_detail.png) |
| 18 | `/gamification` | Gamification | ![Gamification](docs/screenshots/admin/20_gamification.png) |
| 19 | `/gamification/badges` | Badges | ![Badges](docs/screenshots/admin/21_badges.png) |
| 20 | `/gamification/rewards` | Reward Rules | ![Reward Rules](docs/screenshots/admin/22_reward_rules.png) |
| 21 | `/gamification/leaderboard` | Leaderboard | ![Leaderboard](docs/screenshots/admin/23_leaderboard.png) |
| 22 | `/analytics` | Analytics Overview | ![Analytics](docs/screenshots/admin/24_analytics.png) |
| 23 | `/analytics/civic-health` | Civic Health | ![Civic Health](docs/screenshots/admin/25_analytics_civic_health.png) |
| 24 | `/automation` | Automation Center | ![Automation](docs/screenshots/admin/26_automation.png) |
| 25 | `/automation/rules` | Automation Rules | ![Automation Rules](docs/screenshots/admin/27_automation_rules.png) |
| 26 | `/safety` | Safety Alerts | ![Safety Alerts](docs/screenshots/admin/28_safety_alerts.png) |
| 27 | `/notifications` | Notifications | ![Notifications](docs/screenshots/admin/29_notifications.png) |
| 28 | `/settings` | Settings | ![Settings](docs/screenshots/admin/30_settings.png) |
| 29 | `/settings/categories` | Categories | ![Categories](docs/screenshots/admin/31_categories.png) |
| 30 | `/settings/ai-verification` | AI Verification Settings | ![AI Config](docs/screenshots/admin/32_ai_config.png) |
| 31 | `/settings/roles` | Roles & Permissions | ![Roles](docs/screenshots/admin/33_roles.png) |

### 📸 Dashboard Screenshots

> **How to capture:** Open http://localhost:5173 → log in → navigate to each page
> → OS screenshot → save to the path in [`docs/screenshots/README.md`](docs/screenshots/README.md).
> Image references above render automatically once PNGs are added.

<details>
<summary><b>📊 Dashboard (Civic Command Center) — wireframe</b></summary>

![Dashboard](docs/screenshots/admin/02_dashboard.png)

```
┌────┬──────────────────────────────────────────────┐
│SB  │  Dashboard · Civic Command Center    🔴 🟢  │
│    ├──────────────────────────────────────────────┤
│ 📊 │ ┌────┐┌────┐┌────┐┌────┐┌────┐               │
│ 📋 │ │Total││Pend ││Prog ││Resv ││NoLoc│  KPI row  │
│ 🤖 │ │1423 ││ 87  ││ 45  ││987  ││ 12  │           │
│ 🔄 │ └────┘└────┘└────┘└────┘└────┘               │
│ 🗺️ │ ┌────────────────────────────────────────┐  │
│ 🚨 │ │         Mapbox GL Map                   │  │
│ 🏛️ │ │   🟢🟢🔴🟡  (markers/heatmap/cluster)    │  │
│ 👮 │ │       [📍 Bhopal center]                 │  │
│ 🏆 │ └────────────────────────────────────────┘  │
│ 📈 │ Filters: [Status][Severity][Cat][Dept][Ward]│
│ ⚙️ │ Mode: [Markers][Heatmap][Both] [Cluster]    │
│    │ Recent Complaints (bottom list)              │
│    │ ┌──── AI Civic Insights ────────────────┐  │
│    │ │ Top categories, hotspots, anomalies    │  │
│    │ └────────────────────────────────────────┘  │
└────┴──────────────────────────────────────────────┘
```
**Data:** `get_dashboard_complaints` RPC. **Realtime:** `useNewComplaintsRealtime`, `useActivityFeedRealtime`.

</details>

<details>
<summary><b>📋 Complaints List — wireframe</b></summary>

![Complaints](docs/screenshots/admin/04_complaints.png)

```
┌────┬──────────────────────────────────────────────┐
│SB  │ Complaints                                    │
│    ├──────────────────────────────────────────────┤
│    │ [Search] [Status▼] [Severity▼] [Cat▼] [SLA▼] │
│    │ [Date] [Sort▼]                                │
│    ├──────────────────────────────────────────────┤
│    │ ☐ ID    Title      Citizen  Cat  Status SLA  │
│    │ ☐ JM-.. Pothole    Aarav    Pothole VERIFIED ●│
│    │ ☐ JM-.. Garbage    Priya    Garbage ASSIGNED ⚠│
│    │ ☐ JM-.. Streetlight Meera    Light  IN_PROG  ●│
│    │ ...                                           │
│    ├──────────────────────────────────────────────┤
│    │ [Bulk Delete] [Change Status] [Assign]        │
│    │ ← Prev  1 2 3 ...  Next →                     │
└────┴──────────────────────────────────────────────┘
```
Filters in URL search params. Bulk actions role-gated. Realtime invalidation.

</details>

<details>
<summary><b>🔍 Complaint Detail — wireframe</b></summary>

![Complaint Detail](docs/screenshots/admin/05_complaint_detail.png) ![AI Panel](docs/screenshots/admin/06_ai_panel.png)

```
┌────┬──────────────────────────────────────────────┐
│SB  │ JM-2026-000123 · Pothole near MP Nagar        │
│    │ [🟢 VERIFIED][🔴 HIGH]                        │
│    ├──────────────────────────────────────────────┤
│    │ Workflow Timeline: ●→●→●→○→○→○                │
│    │ ┌── AI Verification Panel ────────────────┐  │
│    │ │ Decision: PASS · Match: HIGH · Quality: OK│
│    │ │ Evidence: [img][img][img]                │  │
│    │ │ [Verify ✓][Reject ✗][Request Evidence ⚠]│  │
│    │ └──────────────────────────────────────────┘  │
│    │ Assignment: Roads · Ramesh · Ward 5           │
│    │ Resolution Evidence: [before][after]           │
│    │ Community Verification: 7 ✓ / 1 ✗              │
│    │ Automation History: (timeline)                │
│    │ [Change Status][Assign][Add Note][Escalate]    │
│    │ [Reopen][Link Incident]                        │
└────┴──────────────────────────────────────────────┘
```
AI panel shows only when status ∈ AI_*. Human override via `officer_review_complaint`.

</details>

<details>
<summary><b>🤖 AI Review Queue — wireframe</b></summary>

![AI Review Queue](docs/screenshots/admin/07_ai_review_queue.png)

```
┌────┬──────────────────────────────────────────────┐
│SB  │ AI Review Queue                    [✓ 0 left] │
│ 🤖 ├──────────────────────────────────────────────┤
│    │ Number  Category  Title      AI   Conf Alert  │
│    │ JM-..   Pothole   Large...   REVIEW MED  low   │
│    │ JM-..   Garbage   Pile...    FAIL   LOW  qual  │
│    │ JM-..   Light     Broken...  REVIEW HIGH missing│
│    │ → click row opens /complaints/:id?ai-review=true│
└────┴──────────────────────────────────────────────┘
```
`get_complaints_for_ai_review` RPC. Sidebar badge via `get_ai_review_queue_count`.

</details>

<details>
<summary><b>🗺️ Civic Map — wireframe</b></summary>

![Civic Map](docs/screenshots/admin/09_civic_map.png)

Full-screen Mapbox GL JS split view + side list. `get_map_complaints` (viewport-bounded PostGIS). Markers/heatmap/clustering via `supercluster`.

</details>

<details>
<summary><b>⏱️ SLA Management — wireframe</b></summary>

![SLA](docs/screenshots/admin/12_sla.png)

```
┌──────────────────────────────────────────────┐
│ SLA Management                                 │
│ ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐         │
│ │OnTrk││DueSn││AtRsk││Brch ││Esc ││Resv │  6 KPIs │
│ └────┘└────┘└────┘└────┘└────┘└────┘         │
│ SLA Lifecycle: ●●●○○○                          │
│ ┌── At Risk ──┐ ┌── Due Soon ──┐ ┌── Breached ──┐│
│ │ JM-.. 4h ⏱ │ │ JM-.. 18h ⏱ │ │ JM-.. 2d ⏱  ││  ← live countdowns
│ └────────────┘ └────────────┘ └────────────┘ │
└──────────────────────────────────────────────┘
```

</details>

<details>
<summary><b>🚨 Safety Alerts — wireframe</b></summary>

![Safety Alerts](docs/screenshots/admin/28_safety_alerts.png)

```
┌──────────────────────────────────────────────┐
│ ⚠️ 1 ACTIVE SOS ALERT ⚠️  [🔇 Buzzer]   ← flashing banner
├──────────────────────────────────────────────┤
│ ┌── Alert Card ──────────────────────────┐    │
│ │ Meera Singh · SOS · CRITICAL (12m)    │    │
│ │ 📍 Link Road, Bhopal [Google Maps]    │    │
│ │ Msg: "Feeling unsafe"                 │    │
│ │ Trusted: Anil (📞) · Priya (📞)        │    │
│ │ [Acknowledge] [Resolve]               │    │
│ └────────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```
Realtime + 15s polling. Buzzer (10s two-tone siren) on new active alert.

</details>

<details>
<summary><b>📊 Analytics — wireframe</b></summary>

![Analytics](docs/screenshots/admin/24_analytics.png)

```
┌──────────────────────────────────────────────┐
│ Analytics Overview · [7d][30d][90d]             │
│ ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐    │
│ │Total││ResRt││AvgRs││Citz ││Resv ││SLA ││Ropn│ KPIs │
│ └────┘└────┘└────┘└────┘└────┘└────┘└────┘    │
│ ┌─── Trend (submitted vs resolved) ────────┐ │
│ │      ╱╲    ╱╲        resolved           │ │  ← Recharts
│ │     ╱  ╲  ╱  ╲                            │ │
│ │  ╱╱╱╱╱╱╱╱╱╱╱╱ submitted                    │ │
│ └──────────────────────────────────────────┘ │
│ ┌── Category Dist ──┐ ┌── Status (pie) ──┐    │
│ │ Pothole  ▓▓▓▓▓ 45  │ │     ◕ Resolved   │    │
│ │ Garbage  ▓▓▓ 28     │ │    ◔ InProgress  │    │
│ └────────────────────┘ └─────────────────┘    │
│ ┌── AI Analytics ──┐ ┌── Department Perf ──┐   │
│ │ Verified 87%     │ │ Roads   45 12 3      │   │
│ │ Failed   8%      │ │ Sanit.  28  5 1      │   │
│ └──────────────────┘ └────────────────────┘   │
└──────────────────────────────────────────────┘
```
`get_analytics_summary` + `get_ai_analytics` + `get_department_analytics` RPCs.

</details>

<details>
<summary><b>⚙️ Automation Center — wireframe</b></summary>

![Automation](docs/screenshots/admin/26_automation.png)

```
┌──────────────────────────────────────────────┐
│ Automation Center · Engine: 🟢 Operational    │
│ ┌─ 12 Health Stats ───────────────────────┐  │
│ │ Rules 24/Active 18 · Exec 312 today      │  │
│ │ Success 94% · Failed 12 · Avg 240ms      │  │
│ └─────────────────────────────────────────┘  │
│ ┌─ 8 Complaint Stats ─────────────────────┐  │
│ │ Auto-verified 87 · Assigned 45 · Esc 12  │  │
│ └─────────────────────────────────────────┘  │
│ Recent Activity Feed (audit timeline)          │
│ Rules Table (per-rule stats)                   │
│ Execution Log (filterable)                     │
│ Failed Automations [Retry]                     │
└──────────────────────────────────────────────┘
```
Realtime `useAutomationRealtime`. Retry via `retry_automation_execution`.

</details>

> Full admin spec: [`docs/22_ADMIN_DASHBOARD_SPEC.md`](docs/22_ADMIN_DASHBOARD_SPEC.md)

---

## 🗄️ Backend & Database

<details>
<summary><b>📊 Core Tables (version-controlled)</b></summary>

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | Citizen accounts (auto from auth.users trigger) | own |
| `categories` | 10 civic issue types (seeded) | public read |
| `complaints` | Filed reports (PostGIS location) | own (no "view all") |
| `complaint_images` | Evidence photos (private bucket) | own |
| `complaint_status_history` | Status audit trail (trigger) | own read |
| `rewards` | Point transactions (append-only, service_role writes) | own read |
| `reward_rules` | Configurable point values (admin) | authenticated read |
| `level_config` | Level thresholds (1–5) | authenticated read |
| `badges` | Badge definitions (JSON criteria) | public read |
| `user_badges` | Badges earned (trigger writes) | own read |
| `notifications` | In-app notifications (trigger-only writes) | own |
| `device_tokens` | FCM registration tokens | own |
| `resolution_evidence` | "After" photos on resolution | authenticated |
| `community_verifications` | Citizen confirm/dispute | authenticated |
| `aadhaar_kyc` | Aadhaar digest + masked (sha256) | own |

</details>

<details>
<summary><b>📊 Live-Only Tables [S] (referenced, not in version-controlled SQL)</b></summary>

`officers`, `departments`, `complaint_assignments`, `assignment_audit_logs`,
`complaint_ai_verification`, `category_ai_config`, `civic_incidents`,
`duplicate_links`, `sla_rules`, `safety_alerts`, `safety_incidents`,
`safety_contacts`, `safety_checkins`, `safe_places`, `anonymous_reports`,
`automation_rules`, `automation_executions`, `automation_audit_log`,
`audit_logs`, `system_config`, `user_settings`, `notification_preferences`,
`notification_config`.

</details>

<details>
<summary><b>🔧 Key RPCs</b></summary>

| RPC | Auth | Purpose |
|-----|------|---------|
| `create_complaint` | authenticated | Create complaint + images atomically (idempotent) |
| `add_evidence_to_complaint` | authenticated | Append evidence (ownership enforced) |
| `find_similar_complaints` | authenticated | pg_trgm + PostGIS duplicate detection |
| `join_similar_complaint` | authenticated | File linked complaint |
| `nearby_complaints` / `_heatmap` | authenticated | PostGIS radius search |
| `award_points` | **service_role only** | Award points (idempotent, anti-cheat) |
| `get_reputation_summary` | authenticated | Points/level/progress |
| `community_leaderboard` | authenticated | Privacy-safe leaderboard |
| `submit_community_verification` | authenticated | Confirm/dispute resolution |
| `submit_aadhaar_registration` | authenticated | Aadhaar KYC (hash + mask) |
| `resolve_phone_login` | anon | Map phone → email |
| `trigger_sos` / `cancel_sos` / `share_location` | authenticated | SOS lifecycle |
| `officer_review_complaint` | admin/officer | Human AI override |
| `manual_assign_complaint` | admin/officer | Assign to dept + officer |
| `reopen_complaint` | admin | Reopen |
| `bulk_delete_complaints` | SYSTEM_ADMIN | Bulk delete |
| `get_dashboard_complaints` | invoker | Dashboard dataset + AI fields |
| `retry_stuck_ai_jobs` | service_role | Retry AI (pg_cron) |

</details>

<details>
<summary><b>⚡ Edge Functions</b></summary>

| Function | In repo? | Purpose |
|----------|---------|---------|
| `send-push-notifications` | ✅ Yes | FCM v1 outbox drain (pg_cron every 1 min) |
| `ai-evidence-verification` | ❌ No [S] | AI image/category validation (deployed separately) |
| `download-my-data` | ❌ No [S] | Citizen data export (deployed separately) |

</details>

<details>
<summary><b>🗄️ Storage Buckets</b></summary>

| Bucket | Public | Mimes | Size | Policies |
|--------|--------|-------|------|----------|
| `complaint_images` | No (signed URLs) | jpg/png/webp | 10 MB | owner + admin |
| `avatars` | Yes | jpg/png/webp | 5 MB | owner upload; public read |

</details>

<details>
<summary><b>📐 ERD</b></summary>

```mermaid
erDiagram
    profiles ||--o{ complaints : "user_id"
    categories ||--o{ complaints : "category_id"
    complaints ||--o{ complaint_images : "complaint_id"
    complaints ||--o{ complaint_status_history : "complaint_id"
    complaints ||--o{ rewards : "complaint_id"
    complaints ||--o{ resolution_evidence : "complaint_id"
    complaints ||--o{ community_verifications : "complaint_id"
    profiles ||--o{ rewards : "user_id"
    profiles ||--o{ user_badges : "user_id"
    badges ||--o{ user_badges : "badge_id"
    profiles ||--o{ notifications : "user_id"
    profiles ||--o{ device_tokens : "user_id"
    profiles ||--o{ aadhaar_kyc : "auth_user_id"
```

</details>

> Full: [`docs/17_DATABASE_DESIGN.md`](docs/17_DATABASE_DESIGN.md) · [`docs/18_DATA_DICTIONARY.md`](docs/18_DATA_DICTIONARY.md) · [`docs/19_API_DOCUMENTATION.md`](docs/19_API_DOCUMENTATION.md)

---

## 🔄 Complaint Lifecycle

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED
    SUBMITTED --> AI_CHECKING
    AI_CHECKING --> AI_VERIFIED: AI PASS
    AI_CHECKING --> AI_REVIEW_REQUIRED: AI REVIEW
    AI_CHECKING --> AI_FAILED: AI FAIL
    AI_VERIFIED --> VERIFIED
    AI_REVIEW_REQUIRED --> VERIFIED: officer verify
    AI_REVIEW_REQUIRED --> REJECTED: officer reject
    AI_REVIEW_REQUIRED --> EVIDENCE_REQUIRED: officer request evidence
    AI_FAILED --> EVIDENCE_REQUIRED
    EVIDENCE_REQUIRED --> AI_CHECKING: citizen adds evidence
    VERIFIED --> ASSIGNED: assign
    ASSIGNED --> ACKNOWLEDGED
    ACKNOWLEDGED --> IN_PROGRESS
    IN_PROGRESS --> RESOLUTION_SUBMITTED
    RESOLUTION_SUBMITTED --> UNDER_REVIEW
    UNDER_REVIEW --> COMMUNITY_VERIFICATION
    COMMUNITY_VERIFICATION --> RESOLVED
    RESOLVED --> CLOSED
    RESOLVED --> REOPENED: dispute/admin
    REOPENED --> ASSIGNED
    SUBMITTED --> REJECTED
    REJECTED --> [*]
    CLOSED --> [*]
```

> Full: [`docs/08_COMPLAINT_LIFECYCLE.md`](docs/08_COMPLAINT_LIFECYCLE.md)

---

## 🤖 AI Evidence Validation

**Human-in-the-loop — AI never auto-rejects.**

```mermaid
flowchart TD
    A[Complaint created AI_CHECKING] --> B[ai-evidence-verification edge fn]
    B --> C{Analysis}
    C -->|PASS| D[AI_VERIFIED → VERIFIED +100 pts]
    C -->|REVIEW| E[AI_REVIEW_REQUIRED → Queue]
    C -->|FAIL| F[AI_FAILED → EVIDENCE_REQUIRED]
    B -->|error| G[stuck → retry_stuck_ai_jobs pg_cron]
    G --> B
    E --> H[Officer override: verify/reject/evidence]
    F --> I[Citizen adds evidence → AI_CHECKING]
```

> AI failure **NEVER** silently rejects — routes to human review.
> Full: [`docs/09_AI_VALIDATION_SPEC.md`](docs/09_AI_VALIDATION_SPEC.md)

---

## 🏆 Gamification

| Activity | Points | Trigger |
|----------|--------|---------|
| Valid issue report | +50 | complaint INSERT |
| Verified report | +100 | status → VERIFIED |
| Volunteer activity | +75 | `record_volunteer_activity` (service_role) |
| Issue resolved | +25 | status → RESOLVED |
| Duplicate/fake report | −50 | status → REJECTED |

| Level | Title | Min points |
|-------|-------|------------|
| 1 | Civic Starter | 0 |
| 2 | Active Citizen | 100 |
| 3 | Community Helper | 300 |
| 4 | Civic Contributor | 600 |
| 5 | Civic Champion | 1000 |

**Badges:** 🏁 First Report · 👁 Civic Watcher · 👥 Community Helper · 💡 Problem Solver · 🏆 Civic Champion · ✅ Trusted Citizen

**Anti-cheat:** clients can NEVER write points/level (`protect_reputation_columns` trigger + RLS + service_role-only `award_points`).

> Full: [`docs/14_GAMIFICATION_SPEC.md`](docs/14_GAMIFICATION_SPEC.md)

---

## 🛡️ Women Safety

| Feature | Mobile | Backend |
|---------|--------|---------|
| SOS (long-press + countdown) | `trigger_sos` RPC | `safety_incidents` [S] |
| Live location sharing (every 15s) | `share_location` RPC | location trail [S] |
| Cancel SOS | `cancel_sos` RPC | status CANCELLED |
| Trusted contacts (max 3) | CRUD RPCs | `safety_contacts` [S] |
| Safety check-in (15/30/60/120 min) | `create/complete_safety_checkin` | auto-SOS on miss |
| Nearby safe places | `find_nearby_safety_places` | POLICE/HOSPITAL/SAFE_PLACE [S] |
| Anonymous report | `submit_anonymous_report` | no identity [S] |
| Emergency call 112 | `url_launcher` | — |
| Admin alert management | — | `get_active_safety_alerts`, acknowledge/resolve, buzzer |

> Full: [`docs/12_SAFETY_RESPONSE_SPEC.md`](docs/12_SAFETY_RESPONSE_SPEC.md)

---

## 🔔 Notifications & Realtime

**Notifications** — trigger-only writes (`create_notification` revoked from clients); FCM push via `send-push-notifications` edge function (outbox pattern, pg_cron every 1 min); respects `notify_push` preference; prunes invalid tokens.

**Realtime** — Supabase `postgres_changes` over WebSocket. Mobile: complaint lifecycle + notifications + nearby. Admin: global + page-level (TanStack Query cache invalidation). Dedup by `commit_timestamp + event + id`.

> Full: [`docs/15_NOTIFICATION_SPEC.md`](docs/15_NOTIFICATION_SPEC.md) · [`docs/16_REALTIME_SPEC.md`](docs/16_REALTIME_SPEC.md)

---

## 🔒 Security & Privacy

<details>
<summary><b>🛡️ Security</b></summary>

- RLS on every table; SECURITY DEFINER RPCs for privileged writes.
- Service-role keys only in Edge Functions (never in clients).
- Reputation columns protected by trigger (anti-cheat).
- Aadhaar stored as SHA-256 digest + masked only (never raw).
- Nearby queries return privacy-safe projections (no user_id, truncated description).
- One account per email, one per phone.
- Admin role from `app_metadata.role` (not self-editable).

</details>

<details>
<summary><b>🔒 Privacy</b></summary>

- Profile visibility levels; location precision (exact/block/ward/city).
- Leaderboard opt-out (`privacy_show_leaderboard`).
- Data download (`download-my-data` edge fn [S]); account deletion (30-day grace + cancel); clear location history; logout all devices.

</details>

> Full: [`docs/20_SECURITY_SPEC.md`](docs/20_SECURITY_SPEC.md) · [`docs/36_PRIVACY_DATA_PROTECTION.md`](docs/36_PRIVACY_DATA_PROTECTION.md) · [`docs/21_RBAC_MATRIX.md`](docs/21_RBAC_MATRIX.md)

---

## 📊 Analytics

Complaint volume · categories · status distribution · resolution time · SLA compliance/breaches · department performance · officer workload · geographic hotspots · AI validation stats · reopened complaints · citizen participation · gamification stats · safety incidents · automation performance · civic health score (= resolution_rate × 0.6 + engagement_rate × 0.4).

> Full: [`docs/25_ANALYTICS_SPEC.md`](docs/25_ANALYTICS_SPEC.md)

---

## ⚙️ Automation

Automation Center (engine status, 12 health stats, 8 complaint stats, activity feed, rules table, execution log, failed retries) + Automation Rules (enable/disable, edit). Tables [S] on live project.

> Full: [`docs/26_AUTOMATION_SPEC.md`](docs/26_AUTOMATION_SPEC.md)

---

## 🧪 Testing

| Surface | Framework | Coverage |
|---------|-----------|----------|
| 📱 Mobile | flutter_test | Minimal (widget tests) |
| 🖥️ Admin frontend | **None** | No tests, no linter ⚠️ |
| 🗄️ Admin backend | Vitest + Supertest | 3 files, happy paths |

> Full: [`docs/28_TESTING_STRATEGY.md`](docs/28_TESTING_STRATEGY.md) · [`docs/29_TEST_CASES.md`](docs/29_TEST_CASES.md)

---

## 🚢 Deployment

| Surface | Method |
|---------|--------|
| Supabase | Hosted project (run SQL; enable Realtime; set secrets) |
| Edge functions | `supabase functions deploy` + `supabase secrets set FIREBASE_SERVICE_ACCOUNT=...` |
| Push outbox | `SELECT cron.schedule('push-outbox', '* * * * *', ...)` |
| AI retry | `SELECT cron.schedule('retry-ai-jobs', '*/2 * * * *', 'SELECT public.retry_stuck_ai_jobs()')` |
| 📱 Mobile | `flutter build apk --release` / `flutter build ios --release` |
| 🖥️ Admin frontend | `npm run build` → serve static `dist/` |
| 🗄️ Admin backend (optional) | `docker compose up -d --build` |

**Never commit secrets.** All secrets are placeholders in `.env.example`.

> Full: [`docs/31_DEPLOYMENT_GUIDE.md`](docs/31_DEPLOYMENT_GUIDE.md)

---

## 📚 Documentation Package

Complete 48-file documentation in [`docs/`](docs/):

<details>
<summary><b>📋 Full Documentation Index (click to expand)</b></summary>

| # | Document | # | Document |
|---|----------|---|----------|
| 00 | [Master Project Document](docs/00_MASTER_PROJECT_DOCUMENT.md) | 24 | [Geolocation Spec](docs/24_GEOLOCATION_SPEC.md) |
| 01 | [SRS](docs/01_SRS.md) | 25 | [Analytics Spec](docs/25_ANALYTICS_SPEC.md) |
| 02 | [PRD](docs/02_PRD.md) | 26 | [Automation Spec](docs/26_AUTOMATION_SPEC.md) |
| 03 | [BRD](docs/03_BRD.md) | 27 | [Audit Log Spec](docs/27_AUDIT_LOG_SPEC.md) |
| 04 | [FRD](docs/04_FRD.md) | 28 | [Testing Strategy](docs/28_TESTING_STRATEGY.md) |
| 05 | [User Stories](docs/05_USER_STORIES.md) | 29 | [Test Cases](docs/29_TEST_CASES.md) |
| 06 | [Use Cases](docs/06_USE_CASES.md) | 30 | [Error Handling](docs/30_ERROR_HANDLING.md) |
| 07 | [End-to-End Workflows](docs/07_END_TO_END_WORKFLOWS.md) | 31 | [Deployment Guide](docs/31_DEPLOYMENT_GUIDE.md) |
| 08 | [Complaint Lifecycle](docs/08_COMPLAINT_LIFECYCLE.md) | 32 | [Development Setup](docs/32_DEVELOPMENT_SETUP.md) |
| 09 | [AI Validation Spec](docs/09_AI_VALIDATION_SPEC.md) | 33 | [CI/CD](docs/33_CICD.md) |
| 10 | [Evidence Management](docs/10_EVIDENCE_MANAGEMENT.md) | 34 | [UI/UX Guidelines](docs/34_UI_UX_GUIDELINES.md) |
| 11 | [Department & Officer Mgmt](docs/11_DEPARTMENT_OFFICER_MANAGEMENT.md) | 35 | [Accessibility](docs/35_ACCESSIBILITY.md) |
| 12 | [Safety Response Spec](docs/12_SAFETY_RESPONSE_SPEC.md) | 36 | [Privacy & Data Protection](docs/36_PRIVACY_DATA_PROTECTION.md) |
| 13 | [SLA Spec](docs/13_SLA_SPEC.md) | 37 | [AI Evaluation Plan](docs/37_AI_EVALUATION_PLAN.md) |
| 14 | [Gamification Spec](docs/14_GAMIFICATION_SPEC.md) | 38 | [Demo Data Spec](docs/38_DEMO_DATA_SPEC.md) |
| 15 | [Notification Spec](docs/15_NOTIFICATION_SPEC.md) | 39 | [Traceability Matrix](docs/39_TRACEABILITY_MATRIX.md) |
| 16 | [Realtime Spec](docs/16_REALTIME_SPEC.md) | 40 | [Gap Analysis](docs/40_GAP_ANALYSIS.md) |
| 17 | [Database Design](docs/17_DATABASE_DESIGN.md) | 41 | [Known Issues](docs/41_KNOWN_ISSUES.md) |
| 18 | [Data Dictionary](docs/18_DATA_DICTIONARY.md) | 42 | [Roadmap](docs/42_ROADMAP.md) |
| 19 | [API Documentation](docs/19_API_DOCUMENTATION.md) | 43 | [Handover](docs/43_HANDOVER.md) |
| 20 | [Security Spec](docs/20_SECURITY_SPEC.md) | 44 | [Troubleshooting](docs/44_TROUBLESHOOTING.md) |
| 21 | [RBAC Matrix](docs/21_RBAC_MATRIX.md) | 45 | [ADR](docs/45_ADR.md) |
| 22 | [Admin Dashboard Spec](docs/22_ADMIN_DASHBOARD_SPEC.md) | 46 | [Glossary](docs/46_GLOSSARY.md) |
| 23 | [Mobile App Spec](docs/23_MOBILE_APP_SPEC.md) | 47 | [Documentation Status](docs/00_DOCUMENTATION_STATUS.md) |

</details>

Screenshots guide: [`docs/screenshots/README.md`](docs/screenshots/README.md)

---

## ⚠️ Known Issues

> Full register: [`docs/41_KNOWN_ISSUES.md`](docs/41_KNOWN_ISSUES.md) · [`docs/40_GAP_ANALYSIS.md`](docs/40_GAP_ANALYSIS.md)

| # | Severity | Issue |
|---|----------|-------|
| KI-001 | 🔴 Critical | Live schema (officers/departments/AI/safety/automation/SLA/audit) NOT in version-controlled SQL |
| KI-002 | 🔴 Critical | `complaint_status` enum: 6 values in repo, ~19 live |
| KI-004 | 🔴 Critical | Express raw SQL queries `public.complaints` while ORM uses `admin.*` (schema mismatch) |
| KI-005 | 🟠 High | Express backend NOT wired to admin frontend (uses Supabase directly) |
| KI-006 | 🟠 High | `ai-evidence-verification` edge function source not in repo |
| KI-012 | 🟠 High | No Audit Logs admin page |
| KI-014 | 🟠 High | `audit_logs` table not confirmed present; `logAudit` swallows "table not found" |
| KI-017 | 🟠 High | `SLA_WARNING` notification never sent (no background monitor) |
| KI-013 | 🟠 High | Admin frontend: no tests, no linter |
| KI-021 | 🟠 High | No CI/CD config file |
| KI-008 | 🟡 Medium | Admin ComplaintsPage `dateTo` set to `dateFrom` (typo bug) |
| KI-015 | 🟡 Medium | `resolve_phone_login` granted to anon (phone→email enumeration trade-off) |
| KI-016 | 🟡 Medium | No route-level admin role guard (per-feature only) |
| KI-019/020 | 🔵 Low | Stale README / demo account mismatch |

---

## 🗺️ Roadmap

```mermaid
flowchart LR
    P0[Phase 0<br/>Foundation ✅] --> P1[Phase 1<br/>Core MVP ✅]
    P1 --> P2[Phase 2<br/>Verification ⚠️]
    P2 --> P3[Phase 3<br/>AI/Automation ✅⚠️]
    P3 --> P4[Phase 4<br/>Safety/Police ⚠️]
    P4 --> P5[Phase 5<br/>Analytics ✅]
    P5 --> P6[Phase 6<br/>Hardening ⚠️]
    P6 --> P7[Phase 7<br/>Scale 🔜]
```

| Phase | Status | Key gaps |
|-------|--------|----------|
| 0 — Foundation | ✅ Done | — |
| 1 — Core MVP | ✅ Done | — |
| 2 — Verification & municipal workflow | ⚠️ Mostly | Version-control live schema; SLA warnings |
| 3 — AI, automation, safety, analytics | ⚠️ Mostly | Bring AI edge fn into repo; AI hotspots stub |
| 4 — Safety & police response | ⚠️ Partial | Closest-officer/station auto-dispatch |
| 5 — Analytics & optimization | ✅ Done | Hot zones on production map |
| 6 — Production hardening | ⚠️ In progress | Audit Logs page; admin tests; CI/CD; RLS tests |
| 7 — Scale | 🔜 Future | Auto-assignment; offline-first; SMS; multi-city |

<details>
<summary><b>🎯 Recommended Next Priorities</b></summary>

1. **Critical:** Version-control the live schema (officers, departments, AI, safety, automation, SLA, audit tables + extended enum).
2. **Critical:** Fix Express raw SQL schema mismatch OR deprecate the Express backend.
3. **Critical:** Verify AI edge function never silently rejects; bring `ai-evidence-verification` source into repo.
4. **High:** Add Audit Logs page + confirm `audit_logs` table.
5. **High:** Implement SLA warning notifications (background monitor).
6. **High:** Add admin frontend tests + CI/CD + RLS tests.

</details>

> Full: [`docs/42_ROADMAP.md`](docs/42_ROADMAP.md)

---

## 🔐 License

Proprietary. `publish_to: 'none'` (mobile). All rights reserved.

---

<div align="center">

<sub>Built for Bhopal 📍 · Powered by Supabase · Mapbox · Firebase</sub>

<sub>Generated 2026-09-30 by inspecting the actual repository. Implementation
status labels: ✅ Implemented · [S] Specified but not confirmed implemented · ❌ Missing.</sub>

</div>
