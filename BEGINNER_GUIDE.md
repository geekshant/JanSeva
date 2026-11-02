# JanMitra — The Complete Beginner's Guide

> Read this one document from top to bottom and you will understand the entire
> JanMitra project — what it is, why it exists, how it is built, how every piece
> works, and how to run it — even if you have never written a line of code.

---

## How to Read This Guide

This guide is organized into **18 parts**. Each part builds on the one before it.

- **Parts 1–3** are for absolute beginners. They teach the tech concepts you need
  in order to understand the rest. If you already know what a "backend" or a
  "database" or "React" is, you can skim these.
- **Parts 4–14** describe JanMitra itself: the architecture, the apps, the
  features, and the database.
- **Parts 15–18** cover deployment, known issues, how to run the project, and a
  glossary of every technical term used.

Wherever a term might be unfamiliar, it is explained the first time it appears,
and you can also look it up in the **Glossary** at the end (Part 18).

---

# PART 1 — Tech Basics for Beginners

If software feels like a black box, this part is for you. We will define every
concept you need in plain English, using everyday analogies.

## 1.1 What is "Software" and an "App"?

**Software** is just a set of instructions that tells a computer what to do.
An **app** (short for "application") is a specific piece of software that does a
job for a user — for example, a calculator app, a maps app, or a complaint-
reporting app.

Think of software like a recipe. The computer is the cook; the code is the
recipe; the result (a cake, a screen, a saved record) is what you see.

## 1.2 Frontend, Backend, and Database — the Three Layers

Almost every modern app is split into three layers. A useful analogy is a
**restaurant**:

| Restaurant | App equivalent | What it does |
|-----------|----------------|--------------|
| The dining room, menu, waiter | **Frontend** | What the user sees and interacts with |
| The kitchen | **Backend** | The logic that does the real work |
| The pantry / store room | **Database** | Where everything is stored |

- The **frontend** is the part the user touches: buttons, screens, maps,
  forms. In JanMitra there are *two* frontends — a **mobile app** (for citizens)
  and a **web dashboard** (for municipal staff).
- The **backend** is the "brain" that processes requests, enforces rules,
  decides who is allowed to do what, and talks to the database. In JanMitra the
  backend is mainly a service called **Supabase** (explained soon).
- The **database** is the organized store room where all the data lives — every
  user, every complaint, every photo, every point earned. JanMitra uses a
  database called **Postgres**.

When a citizen taps "Submit" on a pothole complaint, the *frontend* sends a
request to the *backend*, the *backend* checks the rules and writes the
complaint into the *database*, then replies "saved" so the *frontend* can show
"Complaint filed".

## 1.3 Mobile App vs Web App vs Website

- A **mobile app** is software you install on a phone (like from the Play
  Store). It can use the phone's camera, GPS, and push notifications. JanMitra's
  citizen app is a mobile app.
- A **web app** (or "web dashboard") runs inside a browser (Chrome, Edge,
  Safari) at a web address like `http://localhost:5173`. You do not install it.
  JanMitra's admin dashboard is a web app.
- A **website** is a simpler, mostly-informational web page. A *web app* is
  interactive — you log in, click things, and it changes.

## 1.4 Programming Languages and Frameworks

A **programming language** is the language humans use to write instructions for
computers (e.g., Dart, JavaScript/TypeScript, SQL). A **framework** is a
pre-built toolkit that makes writing an app faster — it gives you ready-made
parts (buttons, navigation, data loading) so you do not reinvent the wheel.

JanMitra uses several languages and frameworks. We will meet each one in Part 3.

## 1.5 What is the "Cloud"?

The **cloud** just means "someone else's computer, accessed over the internet."
Instead of buying and maintaining your own server in a basement, you rent
computing power from a company. Supabase, Firebase, and Mapbox are all cloud
services — they run on computers in data centers, and your app talks to them
over the internet.

## 1.6 What is an API?

An **API** (Application Programming Interface) is the menu of requests a
backend accepts. In a restaurant, the menu tells you what you can order; it does
not tell you how the kitchen cooks it. An API is the same idea for software.

JanMitra's backend exposes an API. When the mobile app wants to "create a
complaint", it sends a specific API request; the backend knows what to do.

A **REST API** is a popular style of API using web addresses (URLs) and verbs
like GET, POST, PATCH, DELETE. A **RPC** (Remote Procedure Call) is another
style where you call a named function on the server, like
`create_complaint(...)`. JanMitra uses both styles (Supabase mostly uses RPCs).

## 1.7 What is Authentication and Authorization?

These two words are often confused:

- **Authentication** = proving *who you are* (logging in with email + password).
- **Authorization** = deciding *what you are allowed to do* once we know who you
  are (a citizen can file complaints; an officer can resolve them; an admin can
  delete them).

JanMitra uses **Supabase Auth** for authentication and a system called **RLS**
(Row Level Security) plus **roles** for authorization (more in Part 13).

## 1.8 What is "Realtime"?

Normally an app asks the server a question and gets an answer. **Realtime**
means the server pushes new information to the app the instant it happens,
without the app having to ask again and again.

Example: a citizen files a complaint; an officer in the admin dashboard sees it
appear on the list *immediately*, without refreshing the page. That is
realtime. JanMira uses Supabase Realtime (built on **WebSockets**, a kind of
always-open phone line between app and server).

## 1.9 What is a Database, SQL, Tables, and Rows?

A **database** is an organized collection of data. **Postgres** (also called
PostgreSQL) is a popular, powerful, free database.

A database contains **tables**. A table is like a spreadsheet:

- Each **table** has a name (e.g., `complaints`).
- Each **column** is a field (e.g., `id`, `title`, `status`, `location`).
- Each **row** is one record (one complaint).

**SQL** (Structured Query Language) is the language used to talk to a database.
Examples:
- `INSERT INTO complaints (...)` — add a complaint.
- `SELECT * FROM complaints WHERE status = 'RESOLVED'` — find resolved ones.
- `UPDATE complaints SET status = 'CLOSED' WHERE id = 123` — change one.

A **trigger** is code that runs automatically when something happens in the
database (e.g., "whenever a new complaint is inserted, also write a notification
row"). A **function** (or **stored procedure**) is a reusable block of SQL code
the app can call by name. JanMitra has *many* of both.

## 1.10 What is "Version Control" (Git)?

**Version control** is a system that records every change to a project's files
over time, so you can see history, undo mistakes, and collaborate. **Git** is
the most popular version-control tool; **GitHub** is a website that hosts Git
projects. JanMitra's files live in a Git-managed folder. The "repo" (short for
repository) is just the project folder tracked by Git.

## 1.11 Open Source vs Proprietary

- **Open source** software is free to use, study, and modify (e.g., Postgres,
  React, Flutter).
- **Proprietary** software is owned and restricted (e.g., you cannot just copy
  and resell it).

JanMitra is **proprietary** — it is built *using* open-source tools, but the
JanMitra product itself is not freely redistributable.

---

# PART 2 — What is JanMitra?

## 2.1 The Problem JanMitra Solves

In many Indian cities, including **Bhopal** (the city JanMitra is built for),
reporting a civic problem is painful:

- A citizen sees a pothole, a garbage pile, a broken streetlight, water
  leakage, stray animals, or an unsafe spot.
- To complain, they must call a phone number or visit a municipal office and
  fill a paper register.
- There is no photo, no exact location, no category, no tracking number.
- The complaint often gets lost. The citizen never finds out what happened.
- The municipality has no good data: no photos, no map of hotspots, no way to
  measure how fast problems get fixed, no accountability.

The result is distrust, slow resolution, and frustration on both sides.

## 2.2 The Solution: JanMitra

**JanMitra** (from Hindi: *Jan* = people/citizens, *Mitra* = friend —
"friend of the citizens") is a **gamified civic engagement platform**. It is a
single system that connects citizens and their municipality.

The flow, in one sentence:

> A citizen captures a **photo** + **location** + **category** of a civic
> problem, files it in under a minute, tracks it transparently through a
> municipal workflow, gets notified at every step, earns **civic reputation**
> (points, badges, levels), and can use **women-safety** tools (SOS, trusted
> contacts, safety check-in, nearby safe places, anonymous reporting).
> Municipal staff manage the whole workflow via an admin dashboard with
> **AI-assisted evidence validation**, **SLA monitoring**,
> department/officer assignment, analytics, and automation.

## 2.3 The Five Verbs of JanMitra

The project's tagline is:

**Report. Track. Resolve. Reward. Stay Safe.**

| Verb | Who | How |
|------|-----|-----|
| Report | Citizen | Mobile app: photo + location + category |
| Track | Citizen + Officer | Realtime status updates on both apps |
| Resolve | Officer | Admin dashboard: acknowledge, work, upload resolution evidence |
| Reward | System | Automatic points, badges, levels for good participation |
| Stay Safe | Citizen (especially women) | SOS, check-in, safe places, anonymous reporting |

## 2.4 Who Uses JanMitra? (The Five User Types)

| User | Surface | What they do |
|------|---------|--------------|
| **Citizen** | Mobile app | Reports issues, tracks them, verifies others' resolutions, earns reputation, uses safety features |
| **Officer** | Admin dashboard | Field worker — acknowledges assignments, works on them, uploads "after" photos |
| **Department Admin** | Admin dashboard | Manages a department's complaints and officers (e.g., the Roads department) |
| **Municipal / System Admin** | Admin dashboard | Full governance: everything, plus analytics, automation, settings, user suspension |
| **Police / Safety Responder** | Admin dashboard | Acknowledges and resolves SOS / safety alerts |

## 2.5 What Kinds of Issues Can Be Reported?

JanMitra seeds **10 civic issue categories**, such as:
potholes, garbage, broken streetlights, water leakage, unauthorized
construction, stray animals, and public safety hazards. (See the database
section for the full seeded list.)

## 2.6 Vision and Mission

- **Vision:** A city where every citizen is an active participant in keeping
  their neighbourhood clean, safe, and well-maintained — and where the
  municipality responds transparently and accountably.
- **Mission:** Make complaint reporting effortless (photo + location + a few
  taps), make municipal response transparent (real-time status, SLA tracking,
  officer assignment), and make civic participation rewarding (gamified
  reputation).

---

# PART 3 — The Technology Stack (Explained for Beginners)

JanMitra is built from several tools working together. Here is each one, what
it is, and why it was chosen.

## 3.1 Flutter (the Mobile App)

**Flutter** is a Google-made framework for building mobile apps. You write code
once in a language called **Dart**, and Flutter produces an app that runs on
both **Android** and **iOS**. That is a big deal — without Flutter you would
have to write the app twice (once in Java/Kotlin for Android, once in Swift for
iOS).

The citizen-facing app is built with Flutter. It uses several Flutter
"packages" (add-ons):

| Package | What it does |
|---------|--------------|
| `flutter_riverpod` | Manages app "state" (the data the screens show) cleanly |
| `go_router` | Handles navigation between screens |
| `supabase_flutter` | Talks to the Supabase backend |
| `flutter_map` + Mapbox tiles | Draws the map |
| `geolocator` / `geocoding` | Reads the phone's GPS and converts coordinates to addresses |
| `firebase_messaging` / `flutter_local_notifications` | Push notifications |
| `image_picker` | Lets the user pick/capture photos |
| `shared_preferences` | Saves small settings on the phone |

## 3.2 React + Vite + TypeScript (the Admin Web Dashboard)

The admin dashboard is a **web app** built with three tools:

- **React** — a Facebook-made framework for building user interfaces out of
  reusable "components" (little Lego bricks of UI).
- **Vite** — a fast development tool that serves the app during development and
  builds the final static files for production.
- **TypeScript** — a stricter version of JavaScript that catches many bugs
  before the code even runs (by adding "types" — labels saying what each
  variable is).

Supporting libraries:

| Library | What it does |
|---------|--------------|
| **Tailwind CSS** + **shadcn/ui** (Radix) | Styling and ready-made accessible components |
| **TanStack Query** | Fetches and caches data from the backend, refetches on realtime updates |
| **Mapbox GL JS** + **supercluster** | Interactive map + clustering many markers |
| **Recharts** | Charts for analytics |
| **react-router-dom** | Navigation between admin pages |

## 3.3 Supabase (the Main Backend)

**Supabase** is an open-source "backend-as-a-service." Instead of writing a
backend from scratch, you use Supabase and it gives you, out of the box:

- A **Postgres database** (the pantry).
- **Auth** (login, signup, password reset, sessions).
- **Storage** (file uploads — for photos).
- **Realtime** (live updates pushed to apps).
- **Edge Functions** (small server-side functions for jobs that need extra
  privileges or secrets).
- **Row Level Security (RLS)** — per-row permissions inside the database.

This is why JanMitra can have a full backend without writing a huge custom
server. The mobile and admin apps talk to Supabase directly using an "SDK"
(software development kit) — a library that makes calling Supabase easy.

> Supabase is the **primary, live backend** for both the mobile app and the
> admin dashboard.

## 3.4 Postgres, PostGIS, and Extensions

**Postgres** is the database engine under Supabase. JanMitra uses several
Postgres **extensions** (extra add-on capabilities):

- **PostGIS** — adds geography support. Lets you ask "find all complaints
  within 2 km of me" or "is this point inside Bhopal?".
- **pg_trgm** — "trigram" similarity for fuzzy text matching. Used to detect
  duplicate complaints ("pothole near gate" vs "pothole at gate").
- **pgcrypto** — cryptographic functions (used to hash Aadhaar numbers).
- **pg_net** — lets the database make HTTP requests (used to call edge
  functions).
- **pg_cron** — a scheduler inside Postgres, like a clock that runs jobs (e.g.,
  "every minute, send pending push notifications").

## 3.5 Mapbox (the Maps)

**Mapbox** provides the actual map pictures ("tiles") and geocoding. Both apps
show Mapbox maps. (The original plan said Google Maps, but the build ended up
using Mapbox — this is recorded as an Architecture Decision, ADR-004.)

## 3.6 Firebase Cloud Messaging (Push Notifications)

**FCM** is Google's service for sending **push notifications** — the little
messages that pop up on your phone even when the app is closed. JanMitra uses
FCM to tell citizens "Your complaint was verified" or "Your complaint was
resolved."

## 3.7 Edge Functions (Supabase Deno)

An **Edge Function** is a small piece of server-side code that runs close to
the user (at the "edge" of the cloud). Supabase runs these on a runtime called
**Deno** (a secure JavaScript/TypeScript runtime).

JanMitra uses edge functions for jobs that need secret keys or extra
privileges:
- `send-push-notifications` — drains the notification "outbox" and sends pushes
  via FCM. (This one's source code is in the repo.)
- `ai-evidence-verification` — checks complaint photos against the category
  with AI (source not in the repo; deployed separately).
- `download-my-data` — exports a citizen's data for privacy/ GDPR-style
  requests (source not in the repo).

## 3.8 The Parallel Express + Prisma Backend

Here is something important and a little unusual: the repository **also**
contains a *second, separate backend* in `ADMIN/backend/`. It is built with:

- **Express** (a Node.js web framework),
- **Prisma** (an "ORM" — a tool that lets you talk to the database using code
  instead of raw SQL),
- **Socket.IO** (realtime),
- **JWT** (JSON Web Tokens — a way to do login sessions),
- **Cloudinary** (image uploads),
- **Firebase Admin** (push).

It has **57 REST endpoints** and its own tables in a *separate* `admin` schema
inside the same Postgres database.

**However — and this is the single most important architectural fact — the
admin frontend does NOT use this Express backend.** The admin frontend talks to
**Supabase directly**. The Express backend is a *parallel/alternate*
implementation that is not wired in. We explain why this matters in Part 4.

---

# PART 4 — System Architecture (How the Pieces Fit Together)

## 4.1 The Big Picture

```
                     +-----------------------------------------+
                     |               CLIENTS                   |
                     |  +----------------+  +----------------+  |
                     |  | Mobile App     |  | Admin Dashboard|  |
                     |  | (Flutter)       |  | (React/Vite/TS)|  |
                     |  +-------+--------+  +--------+-------+  |
                     +----------|---------------------|--------+
                                |                     |
                                | supabase_flutter    | @supabase/supabase-js
                                | (RPC, Realtime,      | (RPC, Realtime)
                                |  Storage)            |
                                v                     v
                     +-----------------------------------------+
                     |         SUPABASE PROJECT (Postgres)     |
                     |   public schema: tables, RPCs, RLS,     |
                     |   triggers, Realtime                   |
                     +---+-----------------------------+-------+
                         |                             |
                         | service_role (secrets)      | (raw SQL only —
                         v                             |  schema mismatch,
                     +---------------+                 |  not wired)
                     | Edge Functions|                 v
                     | (send-push,   |          +----------------+
                     |  ai-evidence, |          | Express+Prisma |
                     |  download)    |          | backend (ADMIN)|
                     +-------+-------+          | admin schema   |
                             |                  +----------------+
                             v
                     +----------------+
                     | Firebase Cloud |
                     | Messaging (FCM) |
                     +----------------+
```

Read it like this:
1. The **citizen** uses the **mobile app**; the **municipal staff** use the
   **admin dashboard**.
2. Both apps talk to the **same Supabase project** — they share the same
   database, auth, storage, and realtime.
3. **Edge functions** run server-side with secret keys to do privileged jobs
   (sending pushes, AI checks).
4. The **Express + Prisma backend** sits to the side; it is in the repo but not
   connected to the admin frontend.

## 4.2 The Two Backends (Critical to Understand)

There are two backend implementations in the repo:

1. **Supabase-direct (public schema)** — the *primary, live* backend. Both the
   mobile app and the admin frontend call Supabase RPCs and read/write tables
   scoped by RLS. This is what actually runs.
2. **Express + Prisma (admin schema)** — a standalone REST API with its own
   data model in a separate `admin` schema. It is complete (57 endpoints, JWT
   auth, Socket.IO, Cloudinary) but **not wired to the admin frontend**.

**Why does this matter?** Because anyone reading the code might assume the
admin frontend uses the Express backend in `ADMIN/backend/`. It does not. If
you change something in the Express backend, the admin dashboard will not
notice. The Supabase-direct path is the one in active use.

## 4.3 The "Live Schema vs Repo Schema" Gap (Also Critical)

This is the second most important fact. The repo's `database/` folder
contains **version-controlled SQL** (files numbered `01` to `16`) that creates
many tables in the `public` schema. But the mobile and admin apps **reference
many tables that are never created in any committed SQL file**, for example:

- `officers`, `departments`, `complaint_assignments`, `assignment_audit_logs`
- `complaint_ai_verification`, `category_ai_config`
- `civic_incidents`, `duplicate_links`
- `sla_rules`, `safety_alerts`, `safety_incidents`, `safety_contacts`,
  `safety_checkins`, `safe_places`, `anonymous_reports`
- `automation_rules`, `automation_executions`, `automation_audit_log`
- `audit_logs`, `system_config`, `user_settings`, `notification_preferences`,
  `notification_config`, `wards`

These tables **exist on the live hosted Supabase project** but were applied
directly, not through version-controlled migrations. Throughout the project
docs, such items are labeled **[S]** (Specified, not confirmed in repo).

Similarly, the `complaint_status` enum (a predefined list of allowed status
values) is created in `01_schema.sql` with only **6 values**:

```
SUBMITTED, VERIFIED, ASSIGNED, IN_PROGRESS, RESOLVED, REJECTED
```

…but the live project and both apps use about **19 values**, including:
`AI_CHECKING`, `AI_VERIFIED`, `AI_REVIEW_REQUIRED`, `AI_FAILED`,
`EVIDENCE_REQUIRED`, `ACKNOWLEDGED`, `RESOLUTION_SUBMITTED`, `UNDER_REVIEW`,
`COMMUNITY_VERIFICATION`, `CLOSED`, `REOPENED`, and more. The live enum was
extended with `ALTER TYPE ADD VALUE` statements outside the repo.

**Takeaway:** if you set up a *fresh* Supabase project using only the repo SQL,
several features (officers, departments, AI, safety, automation, SLA, audit)
will not work because their tables are missing. They exist only on the live
project.

## 4.4 Repository Structure (the Folder Layout)

```
JanMitra/
├── ADMIN/
│   ├── backend/              # Express + Prisma (parallel, NOT wired)
│   │   ├── prisma/           #   schema.prisma, migrations/, seed.ts
│   │   ├── src/              #   modules: auth, users, departments,
│   │   │                     #   complaints, analytics, rewards, ...
│   │   └── tests/            #   Vitest + Supertest (3 files)
│   └── frontend/            # React admin dashboard (PRIMARY admin surface)
│       └── src/
│           ├── pages/        #   ~33 pages (dashboard, complaints, map, ...)
│           ├── components/   #   layout, common, complaints, map, ...
│           ├── services/     #   Supabase service layer
│           ├── hooks/        #   TanStack Query + realtime
│           ├── contexts/     #   Auth, Realtime, Buzzer, Theme
│           └── lib/          #   supabase.ts, workflow.ts (RBAC)
├── database/                # Supabase public-schema SQL (01–16 + full_setup)
├── mobile/                  # Flutter citizen app
│   └── lib/
│       ├── core/  data/  features/
│       └── features/ has: splash, auth, home, report_issue, complaints,
│                       map, verification, safety, gamification,
│                       notifications, profile, missions, realtime
├── supabase/
│   └── functions/
│       └── send-push-notifications/index.ts   # only edge function in repo
├── docs/                    # 48-file documentation package
│   └── screenshots/         # mobile/ + admin/ (add PNGs here)
└── README.md                # project overview
```

The three things that actually run in production are:
1. `mobile/` (Flutter citizen app),
2. `ADMIN/frontend/` (React admin dashboard),
3. `database/` SQL applied to the Supabase project + the `send-push-notifications`
   edge function.

The `ADMIN/backend/` is present but not used by the frontend.

---

# PART 5 — The Citizen Mobile App (Every Feature Explained)

This is the app citizens install on their phones. It is built in Flutter and
has the following screens and features. All are implemented in the source.

## 5.1 Authentication & Onboarding

- **Splash + Onboarding:** a 3-page intro shown the first time; the app
  remembers you have seen it.
- **Register:** name, email, 10-digit phone, password (with strength meter).
  When you sign up, a database **trigger** called `handle_new_user`
  automatically creates your profile row.
- **Login:** with email *or* phone + password. If you log in with a phone, an
  RPC called `resolve_phone_login` maps your phone number to your email behind
  the scenes (Supabase Auth works on email, so we translate).
- **Password reset:** via a deep link that opens the reset-password screen.
- **Aadhaar KYC (optional):** you can enter your 12-digit Aadhaar number
  (formatted as `XXXX XXXX XXXX`) and give consent. JanMitra never stores the
  raw number — it stores a **SHA-256 digest** (a one-way cryptographic
  fingerprint) and a **masked** form (like `XXXX-XXXX-1234`). This can be
  skipped.

## 5.2 Home Dashboard

The home screen shows:
- A header with your name, notification bell, and city (Bhopal).
- An alert if any of your complaints need more evidence.
- A **Civic Reputation** card: your points, level, and progress to the next
  level (e.g., "250 pts, Level 2 Active Citizen, 50% to Level 3").
- Quick action buttons: Report, My Complaints, Map, Rewards, Safety.
- **Nearby Issues** within 2 km (e.g., "Pothole near MP Nagar — HIGH").
- **Recent Complaints** you filed.
- A **Community Snapshot** (e.g., "142 with location, 87 resolved").
- A bottom navigation bar plus a prominent "Report" button (FAB).

The data comes from RPCs `homeDashboardProvider` plus `nearby_complaints` and
`community_complaint_stats`. It refreshes in realtime via
`realtimeRefresherProvider`.

## 5.3 Report Issue — the 5-Step Wizard

Filing a complaint is a 5-step wizard:

1. **Category** — pick from 10 civic issue types.
2. **Photos** — minimum 3, maximum 5 photos (evidence).
3. **Location** — must be inside the **Bhopal geofence** (a drawn boundary).
4. **Details** — title (3–200 chars), description, severity.
5. **Review** — see similar complaints detected, optionally join one instead.

On submit:
- The complaint is created **atomically** (all-or-nothing: complaint + images
  together) using the `create_complaint` RPC.
- It is **idempotent** — a special key `jm_<uid8>_<ts>_<hash>` prevents
  accidental double-submission from creating duplicates.
- An AI verification job is fired.
- A success screen shows the actual points you earned (read from the `rewards`
  table, not hardcoded).

**Duplicate detection:** the `find_similar_complaints` RPC uses
**pg_trgm** (text similarity) + **PostGIS** (distance ≤ 250 m) to find similar
complaints and rank them. If one matches, you can `join_similar_complaint` to
file a linked complaint instead of a duplicate.

## 5.4 My Complaints, Detail, Timeline, Add Evidence

- **My Complaints:** search, filter (All / Active / Resolved / Reopened),
  sort, realtime updates.
- **Complaint Detail:** shows the complaint number (e.g., `JM-2026-000123`),
  title, status badge, severity, assignment (department + officer), AI status
  banner, evidence galleries (per round), resolution evidence, and a
  **timeline** of the workflow (Submitted → Verified → Assigned → ...).
- **Add Evidence:** if the status is `EVIDENCE_REQUIRED` or `AI_FAILED`, you can
  add more photos via `add_evidence_to_complaint`.
- **Delete:** only allowed before verification (so people cannot delete a
  complaint that is already in the municipal workflow).

## 5.5 Map, Heatmap, Community Verification

- **Map:** shows nearby issues as colored markers (by status). You can pick a
  radius (500 m to 10 km), switch modes (Markers / Heatmap / Both), and the map
  refreshes in realtime.
  - The `nearby_complaints` and `nearby_complaints_heatmap` RPCs are
    **privacy-safe**: they do not return user IDs, and they truncate the
    description.
- **Community Verification:** for complaints that have been resolved, you can
  see before/after photos and **confirm** or **dispute** the resolution. You
  must upload verification photos (mandatory). This uses
  `submit_community_verification`. Citizens become a second layer of
  accountability.

## 5.6 Gamification (Rewards, Leaderboard, Badges)

Civic participation is **gamified** — meaning you earn points and rewards like
in a game:

- **Points** for valid reports, verified reports, volunteer activity, resolved
  issues. **Negative** points for fake/duplicate reports.
- **Levels** (1–5): Civic Starter → Active Citizen → Community Helper → Civic
  Contributor → Civic Champion.
- **Badges:** First Report, Civic Watcher, Community Helper, Problem Solver,
  Civic Champion, Trusted Citizen.
- **Leaderboard:** privacy-safe (no user IDs; respects your opt-out setting).

Crucially, **all of this is controlled by the server**, never the client. The
app cannot just award itself points — there is a trigger
(`protect_reputation_columns`) and RLS that block client writes, and only a
service-role RPC `award_points` can add points. This is **anti-cheat**.

## 5.7 Women Safety

A whole section of the app is dedicated to safety:

- **SOS:** long-press a big red button with a 3-2-1 countdown. The `trigger_sos`
  RPC creates a safety incident; then `share_location` sends your live
  location every 15 seconds; `cancel_sos` ends it.
- **Trusted Contacts:** up to 3 people; full CRUD via RPCs.
- **Safety Check-in:** set a timer (15 / 30 / 60 / 120 min). If you do not
  confirm you are safe when it expires, an automatic SOS is triggered.
- **Nearby Safe Places:** `find_nearby_safety_places` lists police stations,
  hospitals, and registered safe places near you.
- **Anonymous Report:** `submit_anonymous_report` lets you report something
  with no identity attached.
- **Emergency 112:** a quick button to dial the Indian emergency number.

## 5.8 Notifications, Profile, Privacy, Accessibility

- **Notifications:** in-app list (mark read is "optimistic" — the UI updates
  instantly), realtime, and push (FCM).
- **Profile:** edit whitelisted fields (name, phone, avatar, city, ward) and
  preferences (5 toggles).
- **Privacy:** profile visibility levels, location precision (exact / block /
  ward / city), Aadhaar masking, data download, account deletion (30-day
  grace), logout all devices, clear location history.
- **Accessibility:** font scale, high contrast, reduce motion, screen reader
  hints, larger touch targets. Persisted locally *and* on the server.
- **Languages:** English + Hindi.
- **Theme:** Material 3 light + dark mode.

---

# PART 6 — The Admin Web Dashboard (Every Page Explained)

The admin dashboard is a React web app running at `http://localhost:5173` in
development. Municipal staff log in with Supabase Auth; their **role**
(`OFFICER`, `DEPARTMENT_ADMIN`, `SYSTEM_ADMIN`) comes from
`app_metadata.role` (a secure field set by an admin, not editable by the user).

It has about **33 pages**. Here they are grouped:

## 6.1 Login & Dashboard

- **Login** — Supabase Auth; role is read from `app_metadata.role`.
- **Dashboard (Civic Command Center)** — the home page for staff. KPIs (Total,
  Pending, In Progress, Resolved, No Location), an interactive Mapbox map with
  markers/heatmap/clustering, recent complaints, and **AI Civic Insights**
  (top categories, hotspots, anomalies). Data via `get_dashboard_complaints`
  RPC; realtime via `useNewComplaintsRealtime` and `useActivityFeedRealtime`.

## 6.2 Complaints

- **Complaints List** — paginated, with filters (search, status, severity,
  category, SLA, date), bulk delete, status change, escalate, add note,
  assign. Filters live in the URL so they are shareable.
- **Complaint Detail** — workflow timeline, the AI Verification Panel (only
  shown when status is an `AI_*` value), assignment info, resolution evidence,
  community verification counts, automation history, incident linking,
  reopen. Officers can do a **human override** via `officer_review_complaint`.
- **AI Review Queue** — a queue of complaints that the AI flagged for human
  review. Data via `get_complaints_for_ai_review`; a sidebar badge shows the
  count via `get_ai_review_queue_count`. Clicking a row opens the complaint
  detail with `?ai-review=true`.
- **Reopened Cases** — complaints that were reopened (by community
  verification dispute or admin). Data via `get_reopened_complaints`.

## 6.3 Map & Incidents

- **Civic Map** — full-screen Mapbox GL JS map with a side list. Uses
  `get_map_complaints` (a viewport-bounded PostGIS query — only fetches
  complaints in the visible area). Markers / heatmap / clustering via
  `supercluster`.
- **Incidents** — a "civic incident" is a group of related complaints (e.g.,
  "the same broken water pipe affecting 3 streets"). You can create incidents,
  link/unlink complaints, and merge them. Tables: `civic_incidents` +
  `duplicate_links` (live-only).

## 6.4 SLA (Service Level Agreement) Management

An **SLA** is a deadline: "potholes in a major road must be fixed in 48 hours."

- **SLA Management** — 6 KPIs (On Track, Due Soon, At Risk, Breached,
  Escalated, Resolved), an SLA lifecycle, and live countdowns for At Risk /
  Due Soon / Breached complaints.
- **SLA Rules** — CRUD on the `sla_rules` table (configure the deadline per
  category and severity).

## 6.5 Organization: Departments, Officers, Citizens

- **Departments** — CRUD; map categories to departments; department detail
  with stats. (e.g., Roads, Sanitation, Street Lighting.)
- **Officers** — CRUD; filter by department; officer detail with stats.
- **Citizens** — `list_citizens` RPC; suspend/restore (SYSTEM_ADMIN only).

## 6.6 Gamification Config

- **Gamification** — overview.
- **Badges** — CRUD badge definitions.
- **Reward Rules** — CRUD the configurable point values.
- **Leaderboard** — view the community leaderboard.
- **Level Config** — read-only level thresholds.

## 6.7 Analytics

- **Analytics Overview** — KPIs (Total, Resolution Rate, Avg Resolution Time,
  Citizens, Resolved, SLA, Reopened), trend charts (submitted vs resolved),
  category distribution, status pie, AI analytics, department performance.
  Uses `get_analytics_summary`, `get_ai_analytics`, `get_department_analytics`.
- **Civic Health** — a "civic health score" computed as
  `resolution_rate × 0.6 + engagement_rate × 0.4`.

## 6.8 Automation

- **Automation Center** — engine status (Operational), 12 health stats (rules
  active, executions today, success %, avg duration), 8 complaint stats
  (auto-verified, auto-assigned, escalated), recent activity feed (audit
  timeline), rules table with per-rule stats, execution log (filterable),
  failed automations with a Retry button. Realtime via `useAutomationRealtime`;
  retry via `retry_automation_execution`.
- **Automation Rules** — enable/disable, edit priority/name/conditions.

## 6.9 Safety Alerts

- **Safety Alerts** — when a citizen triggers an SOS, it appears here as a
  flashing banner with a **buzzer** (a 10-second two-tone siren). The page polls
  every 15 seconds and uses realtime. Each alert shows the citizen, type
  (SOS / check-in), criticality, location with a Google Maps link, message,
  trusted contacts with call buttons, and Acknowledge / Resolve buttons.
  Data via `get_active_safety_alerts`.

## 6.10 Notifications & Settings

- **Notifications** — admin inbox; mark read.
- **Settings** — categories CRUD, notification config, AI verification config,
  demo mode.
- **Roles & Permissions** — a read-only matrix from `lib/workflow.ts`.
  Enforcement is per-feature via `canXxx()` helpers plus server-side RPCs.

## 6.11 Role-Based Access (Who Sees What)

| Action | Citizen | Officer | Dept Admin | System Admin |
|--------|---------|---------|------------|--------------|
| File complaint | yes | — | — | — |
| View own complaints | yes | — | — | — |
| View all complaints | — | yes (assigned) | yes (dept) | yes (all) |
| Acknowledge / resolve | — | yes (assigned) | yes (dept) | yes |
| Assign complaint | — | — | yes (dept) | yes |
| Bulk delete | — | — | — | yes |
| Suspend citizen | — | — | — | yes |
| Manage settings | — | — | — | yes |

The matrix is defined in `ADMIN/frontend/src/lib/workflow.ts`.

---

# PART 7 — The Backend & Database

This part explains how the data is organized and the rules that govern it.

## 7.1 Core Tables (Version-Controlled in the Repo)

These tables are created by the SQL files in `database/`:

| Table | Purpose | RLS (who can see) |
|-------|---------|-------------------|
| `profiles` | Citizen accounts (auto-created from auth users) | own row |
| `categories` | The 10 civic issue types (seeded) | public read |
| `complaints` | Filed reports (with PostGIS location) | own (no "view all") |
| `complaint_images` | Evidence photos (private bucket) | own |
| `complaint_status_history` | Status audit trail (trigger-written) | own read |
| `rewards` | Point transactions (append-only, service_role writes) | own read |
| `reward_rules` | Configurable point values (admin) | authenticated read |
| `level_config` | Level thresholds (1–5) | authenticated read |
| `badges` | Badge definitions (JSON criteria) | public read |
| `user_badges` | Badges earned (trigger-written) | own read |
| `notifications` | In-app notifications (trigger-only writes) | own |
| `device_tokens` | FCM registration tokens | own |
| `resolution_evidence` | "After" photos on resolution | authenticated |
| `community_verifications` | Citizen confirm/dispute | authenticated |
| `aadhaar_kyc` | Aadhaar digest + masked (sha256) | own |

## 7.2 Live-Only Tables [S]

These exist on the live Supabase project but **not** in version-controlled SQL:

`officers`, `departments`, `complaint_assignments`, `assignment_audit_logs`,
`complaint_ai_verification`, `category_ai_config`, `civic_incidents`,
`duplicate_links`, `sla_rules`, `safety_alerts`, `safety_incidents`,
`safety_contacts`, `safety_checkins`, `safe_places`, `anonymous_reports`,
`automation_rules`, `automation_executions`, `automation_audit_log`,
`audit_logs`, `system_config`, `user_settings`, `notification_preferences`,
`notification_config`, `wards`.

## 7.3 Key RPCs (Remote Procedure Calls)

RPCs are named server-side functions the apps call. Important ones:

| RPC | Who can call | Purpose |
|-----|--------------|---------|
| `create_complaint` | authenticated | Create complaint + images atomically (idempotent) |
| `add_evidence_to_complaint` | authenticated | Append evidence (ownership enforced) |
| `find_similar_complaints` | authenticated | Duplicate detection (pg_trgm + PostGIS) |
| `join_similar_complaint` | authenticated | File a linked complaint |
| `nearby_complaints` / `_heatmap` | authenticated | PostGIS radius search (privacy-safe) |
| `award_points` | **service_role only** | Award points (idempotent, anti-cheat) |
| `get_reputation_summary` | authenticated | Points / level / progress |
| `community_leaderboard` | authenticated | Privacy-safe leaderboard |
| `submit_community_verification` | authenticated | Confirm / dispute resolution |
| `submit_aadhaar_registration` | authenticated | Aadhaar KYC (hash + mask) |
| `resolve_phone_login` | anon | Map phone → email |
| `trigger_sos` / `cancel_sos` / `share_location` | authenticated | SOS lifecycle |
| `officer_review_complaint` | admin/officer | Human AI override |
| `manual_assign_complaint` | admin/officer | Assign to dept + officer |
| `reopen_complaint` | admin | Reopen |
| `bulk_delete_complaints` | SYSTEM_ADMIN | Bulk delete |
| `get_dashboard_complaints` | invoker | Dashboard dataset + AI fields |
| `retry_stuck_ai_jobs` | service_role | Retry AI (pg_cron) |

## 7.4 Edge Functions

| Function | In repo? | Purpose |
|----------|---------|---------|
| `send-push-notifications` | yes | FCM v1 outbox drain (pg_cron every 1 min) |
| `ai-evidence-verification` | no [S] | AI image/category validation |
| `download-my-data` | no [S] | Citizen data export |

## 7.5 Storage Buckets

Supabase Storage holds files in **buckets** (like folders with rules):

| Bucket | Public? | Allowed types | Max size | Policies |
|--------|---------|---------------|----------|----------|
| `complaint_images` | No (signed URLs) | jpg/png/webp | 10 MB | owner + admin |
| `avatars` | Yes | jpg/png/webp | 5 MB | owner upload; public read |

Private buckets use **signed URLs** — temporary links that only work for the
authorized user for a limited time.

## 7.6 Entity-Relationship Diagram (Simplified)

```
profiles 1--* complaints 1--* complaint_images
                     |
                     |--* complaint_status_history
                     |--* rewards
                     |--* resolution_evidence
                     |--* community_verifications
categories 1--* complaints
profiles 1--* rewards
profiles 1--* user_badges *--1 badges
profiles 1--* notifications
profiles 1--* device_tokens
profiles 1--* aadhaar_kyc
```

Read `1--*` as "one to many": one profile can have many complaints; one
complaint can have many images.

---

# PART 8 — The Complaint Lifecycle (The Journey of a Complaint)

This is the heart of JanMitra. A complaint moves through a sequence of
statuses. The repo defines only 6 statuses; the live system uses about 19.

## 8.1 The Full State Machine

```
                        +-----------+
                        | SUBMITTED |  (citizen files complaint)
                        +-----+-----+
                              |
                  +-----------+-----------+
                  |                       |
                  v                       v
          +-------------+         +---------------+
          | AI_CHECKING |         |   REJECTED    |
          +------+------+         +---------------+
                 |
       +---------+---------+---------+
       |                   |         |
       v                   v         v
+--------------+  +----------------+  +-----------+
| AI_VERIFIED  |  | AI_REVIEW_REQ. |  | AI_FAILED |
+------+-------+  +------+---------+  +-----+-----+
       |                 |                  |
       |     +-----------+----+-------------+
       |     |                |
       |     v                v
       |  +----------+   +-------------------+
       |  | VERIFIED |   | EVIDENCE_REQUIRED |
       |  +----+-----+   +---------+---------+
       |       |                   |
       |       |     (citizen adds evidence)
       |       |                   |
       |       |         +---------v---------+
       |       |         |   AI_CHECKING     | (loop back)
       |       |         +-------------------+
       |       |
       v       v
  +----------------+    +-------------+
  |   VERIFIED     |--->|  ASSIGNED   |
  +----------------+    +------+------+
                               |
                               v
                        +-------------+
                        | ACKNOWLEDGED|
                        +------+------+
                               |
                               v
                        +-----------+
                        |IN_PROGRESS|
                        +-----+-----+
                              |
                              v
                   +---------------------+
                   |RESOLUTION_SUBMITTED|
                   +----------+----------+
                              |
                              v
                       +-------------+
                       |UNDER_REVIEW |
                       +------+------+
                              |
                              v
                  +------------------------+
                  |COMMUNITY_VERIFICATION  |
                  +-----------+------------+
                              |
                              v
                        +-----------+
                        | RESOLVED  |
                        +-----+-----+
                              |
                  +-----------+-----------+
                  |                       |
                  v                       v
            +---------+            +----------+
            | CLOSED  |            | REOPENED |--> back to ASSIGNED
            +---------+            +----------+
```

## 8.2 The Story of One Complaint

Let us follow complaint `JM-2026-000123`, "Pothole near MP Nagar gate 2":

1. **Citizen Aarav** opens the app, picks category "Pothole", takes 3 photos,
   sets location, writes a title, sets severity HIGH, submits.
   → Status: `SUBMITTED`. He earns +50 points for a valid report.
2. The `create_complaint` RPC creates the complaint + images atomically, then
   fires the AI edge function.
   → Status: `AI_CHECKING`.
3. The AI checks the photos against the category. Suppose it returns **PASS**
   with high confidence.
   → Status: `AI_VERIFIED` → then `VERIFIED`. Aarav earns +100 points.
4. An admin (or automation rule) assigns it to the **Roads** department and
   officer **Ramesh**.
   → Status: `ASSIGNED`.
5. Ramesh opens the admin dashboard, sees the assignment, and acknowledges it.
   → Status: `ACKNOWLEDGED`.
6. Ramesh goes to the site, starts work.
   → Status: `IN_PROGRESS`.
7. Ramesh fills the pothole, takes "after" photos, uploads them as resolution
   evidence.
   → Status: `RESOLUTION_SUBMITTED` → `UNDER_REVIEW`.
8. The system moves it to community verification.
   → Status: `COMMUNITY_VERIFICATION`.
9. Other citizens (e.g., Priya, Meera) look at the before/after photos and
   confirm the fix (with their own verification photos). 7 confirm, 1 disputes.
   → Status: `RESOLVED`. Aarav earns +25 points.
10. After a grace period, the complaint is closed.
    → Status: `CLOSED`.
11. If a citizen disputes the resolution (or an admin reopens it):
    → Status: `REOPENED` → back to `ASSIGNED` for rework.

At every transition, a **notification** is created (by a trigger) and a
**status history** row is recorded (also by a trigger) so there is a full audit
trail.

---

# PART 9 — AI Evidence Validation (Human-in-the-Loop)

JanMitra uses AI to **help** validate evidence, but the AI **never
auto-rejects**. A human is always in the loop.

## 9.1 How It Works

1. When a complaint is created, the status becomes `AI_CHECKING` and the
   `ai-evidence-verification` edge function is called.
2. The AI analyzes the photos against the chosen category (e.g., "do these
   photos actually look like a pothole?") and returns one of:
   - **PASS** — photos match the category and are good quality.
   - **REVIEW** — uncertain; flag for a human.
   - **FAIL** — photos do not match or are poor quality.
3. Outcomes:
   - PASS → `AI_VERIFIED` → `VERIFIED` (+100 points).
   - REVIEW → `AI_REVIEW_REQUIRED` → goes into the **AI Review Queue** in the
     admin dashboard. An officer decides: verify, reject, or request more
     evidence (`officer_review_complaint`).
   - FAIL → `AI_FAILED` → `EVIDENCE_REQUIRED` → the citizen is asked to add
     more evidence; once added, it loops back to `AI_CHECKING`.
4. If the edge function errors out (stuck), a `pg_cron` job called
   `retry_stuck_ai_jobs` runs every 2 minutes to retry.

## 9.2 The Key Principle

> **AI failure never silently rejects a complaint.** If anything goes wrong,
> the complaint is routed to a human reviewer. This protects citizens from
> being ignored by a buggy AI.

## 9.3 Admin AI Settings

Admins can configure AI verification per category via the **AI Verification
Settings** page (`category_ai_config` table, live-only): thresholds,
enabled/disabled per category, etc.

---

# PART 10 — Gamification (Points, Badges, Levels, Leaderboard)

Gamification makes civic participation feel rewarding, like a game.

## 10.1 Points

| Activity | Points | Trigger |
|----------|--------|---------|
| Valid issue report | +50 | complaint inserted |
| Verified report | +100 | status → VERIFIED |
| Volunteer activity | +75 | `record_volunteer_activity` (service_role) |
| Issue resolved | +25 | status → RESOLVED |
| Duplicate / fake report | -50 | status → REJECTED |

## 10.2 Levels

| Level | Title | Min points |
|-------|-------|------------|
| 1 | Civic Starter | 0 |
| 2 | Active Citizen | 100 |
| 3 | Community Helper | 300 |
| 4 | Civic Contributor | 600 |
| 5 | Civic Champion | 1000 |

## 10.3 Badges

- First Report
- Civic Watcher
- Community Helper
- Problem Solver
- Civic Champion
- Trusted Citizen

Badges are defined with JSON criteria and awarded automatically by a trigger
(`check_and_award_badges`) when the criteria are met.

## 10.4 Anti-Cheat (Very Important)

The app **cannot** award itself points. Three layers of protection:
1. **RLS** prevents clients from writing to the `rewards` table.
2. A **trigger** `protect_reputation_columns` blocks direct writes to the
   points/level columns on `profiles`.
3. Only a **service-role** RPC `award_points` can add points, and it is
   **idempotent** (cannot award the same points twice for the same event).

The leaderboard is **privacy-safe** — it does not expose user IDs and respects
your `privacy_show_leaderboard` opt-out.

---

# PART 11 — Women Safety

| Feature | Mobile | Backend |
|---------|--------|---------|
| SOS (long-press + countdown) | `trigger_sos` RPC | `safety_incidents` [S] |
| Live location sharing (every 15 s) | `share_location` RPC | location trail [S] |
| Cancel SOS | `cancel_sos` RPC | status → CANCELLED |
| Trusted contacts (max 3) | CRUD RPCs | `safety_contacts` [S] |
| Safety check-in (15/30/60/120 min) | `create/complete_safety_checkin` | auto-SOS on miss |
| Nearby safe places | `find_nearby_safety_places` | POLICE/HOSPITAL/SAFE_PLACE [S] |
| Anonymous report | `submit_anonymous_report` | no identity [S] |
| Emergency call 112 | `url_launcher` | — |
| Admin alert management | — | `get_active_safety_alerts`, acknowledge/resolve, buzzer |

When a citizen triggers an SOS, it appears in the admin **Safety Alerts** page
with a flashing banner and a buzzer sound. The admin can acknowledge and resolve
the alert, and call the citizen or their trusted contacts.

---

# PART 12 — Notifications & Realtime

## 12.1 Notifications

- **In-app notifications:** stored in the `notifications` table. Writes are
  **trigger-only** — the `create_notification` function is revoked from clients,
  so only server-side triggers can create them. This prevents abuse.
- **Push notifications:** sent via **Firebase Cloud Messaging (FCM)**. The
  `send-push-notifications` edge function drains the notification "outbox"
  every minute (scheduled by `pg_cron`).
- **Preferences:** respects `notify_push`, `notify_email`, `notify_in_app`.
- **Token pruning:** invalid FCM tokens are pruned so the system does not keep
  trying to send to dead devices.

## 12.2 Realtime

**Supabase Realtime** uses **postgres_changes** over **WebSockets** — an
always-open connection between the app and the server.

- **Mobile:** subscribes to complaint lifecycle changes, notifications, and
  nearby complaints.
- **Admin:** subscribes globally and per-page; uses **TanStack Query** cache
  invalidation so the UI updates instantly when data changes.
- **Dedup:** events are deduplicated by `commit_timestamp + event + id` so the
  same change does not appear twice.

---

# PART 13 — Security & Privacy

## 13.1 Security

- **RLS (Row Level Security)** on every table — the database itself enforces
  who can see/edit which rows. Even if a malicious client tried to read
  someone else's complaints, the database would refuse.
- **SECURITY DEFINER RPCs** for privileged writes — these run with elevated
  privileges but only do exactly what their code says.
- **Service-role keys only in Edge Functions** — never shipped in the mobile or
  admin app. The apps use the **anon/publishable key**, which can only do what
  RLS allows.
- **Reputation columns protected by trigger** — anti-cheat.
- **Aadhaar** stored as SHA-256 digest + masked form, never raw.
- **Nearby queries are privacy-safe** — no user IDs, truncated descriptions.
- **One account per email, one per phone.**
- **Admin role from `app_metadata.role`** — set by an admin, not self-editable.

## 13.2 Privacy

- **Profile visibility** levels.
- **Location precision** options: exact / block / ward / city.
- **Leaderboard opt-out** (`privacy_show_leaderboard`).
- **Data download** (`download-my-data` edge function [S]) — export your data.
- **Account deletion** with a 30-day grace period (you can cancel).
- **Clear location history.**
- **Logout all devices.**

---

# PART 14 — Analytics & Automation

## 14.1 Analytics

The admin **Analytics** section turns raw data into insight:

- Complaint volume and trends (submitted vs resolved over time).
- Category distribution (potholes vs garbage vs ...).
- Status distribution (how many in each status).
- Resolution time (average, by category, by department).
- SLA compliance and breaches.
- Department performance and officer workload.
- Geographic hotspots (where problems cluster).
- AI validation statistics (how many passed / failed / reviewed).
- Reopened complaints.
- Citizen participation and gamification stats.
- Safety incidents.
- Automation performance.
- **Civic Health Score** = `resolution_rate × 0.6 + engagement_rate × 0.4`.

Charts are drawn with **Recharts**. Data comes from RPCs like
`get_analytics_summary`, `get_ai_analytics`, `get_department_analytics`.

## 14.2 Automation

The **Automation Center** lets the system act on its own based on rules
(e.g., "if a complaint is AI_VERIFIED and category is Pothole, auto-assign to
Roads department"):

- **Engine status** (Operational).
- **Health stats** (12 metrics: rules active, executions today, success %, avg
  duration, failed count, ...).
- **Complaint stats** (8 metrics: auto-verified, auto-assigned, escalated, ...).
- **Recent activity feed** (audit timeline).
- **Rules table** with per-rule stats.
- **Execution log** (filterable).
- **Failed automations** with a Retry button (`retry_automation_execution`).

Tables: `automation_rules`, `automation_executions`, `automation_audit_log`
(live-only). Realtime via `useAutomationRealtime`.

---

# PART 15 — Deployment (How It Goes Live)

| Surface | How it is deployed |
|---------|-------------------|
| Supabase | Hosted project — run SQL in the SQL Editor; enable Realtime; set secrets |
| Edge functions | `supabase functions deploy` + `supabase secrets set FIREBASE_SERVICE_ACCOUNT=...` |
| Push outbox | `SELECT cron.schedule('push-outbox', '* * * * *', ...)` |
| AI retry | `SELECT cron.schedule('retry-ai-jobs', '*/2 * * * *', 'SELECT public.retry_stuck_ai_jobs()')` |
| Mobile | `flutter build apk --release` (Android) / `flutter build ios --release` (iOS) |
| Admin frontend | `npm run build` → serve the static `dist/` folder |
| Admin backend (optional) | `docker compose up -d --build` |

**Never commit secrets.** All secrets (Supabase URL, anon key, Mapbox token,
Firebase service account, JWT secret, etc.) are placeholders in `.env.example`
files and must be filled in locally / on the server, never pushed to Git.

---

# PART 16 — Known Issues & Roadmap

## 16.1 Known Issues (the most important ones)

| # | Severity | Issue |
|---|----------|-------|
| KI-001 | Critical | Live schema (officers/departments/AI/safety/automation/SLA/audit) NOT in version-controlled SQL |
| KI-002 | Critical | `complaint_status` enum: 6 values in repo, ~19 live |
| KI-004 | Critical | Express raw SQL queries `public.complaints` while ORM uses `admin.*` (schema mismatch) |
| KI-005 | High | Express backend NOT wired to admin frontend (uses Supabase directly) |
| KI-006 | High | `ai-evidence-verification` edge function source not in repo |
| KI-012 | High | No Audit Logs admin page |
| KI-014 | High | `audit_logs` table not confirmed present; `logAudit` swallows "table not found" |
| KI-017 | High | `SLA_WARNING` notification never sent (no background monitor) |
| KI-013 | High | Admin frontend: no tests, no linter |
| KI-021 | High | No CI/CD config file |
| KI-008 | Medium | Admin ComplaintsPage `dateTo` set to `dateFrom` (typo bug) |
| KI-015 | Medium | `resolve_phone_login` granted to anon (phone→email enumeration trade-off) |
| KI-016 | Medium | No route-level admin role guard (per-feature only) |
| KI-019/020 | Low | Stale README / demo account mismatch |

## 16.2 Roadmap

| Phase | Status | Key gaps |
|-------|--------|----------|
| 0 — Foundation | Done | — |
| 1 — Core MVP | Done | — |
| 2 — Verification & municipal workflow | Mostly | Version-control live schema; SLA warnings |
| 3 — AI, automation, safety, analytics | Mostly | Bring AI edge fn into repo; AI hotspots stub |
| 4 — Safety & police response | Partial | Closest-officer/station auto-dispatch |
| 5 — Analytics & optimization | Done | Hot zones on production map |
| 6 — Production hardening | In progress | Audit Logs page; admin tests; CI/CD; RLS tests |
| 7 — Scale | Future | Auto-assignment; offline-first; SMS; multi-city |

## 16.3 Recommended Next Priorities

1. **Critical:** Version-control the live schema (officers, departments, AI,
   safety, automation, SLA, audit tables + extended enum).
2. **Critical:** Fix the Express raw SQL schema mismatch, or deprecate the
   Express backend.
3. **Critical:** Verify the AI edge function never silently rejects; bring
   `ai-evidence-verification` source into the repo.
4. **High:** Add an Audit Logs page + confirm the `audit_logs` table.
5. **High:** Implement SLA warning notifications (background monitor).
6. **High:** Add admin frontend tests + CI/CD + RLS tests.

---

# PART 17 — How to Run the Project

## 17.1 Prerequisites

- **Flutter** 3.x (with Dart 3.13+) for the mobile app.
- **Node.js** 20+ for the admin frontend and (optionally) the Express backend.
- A **Supabase** project (create one free at supabase.com).
- A **Mapbox** account and access token (free tier available).
- A **Firebase** project for push notifications (for full mobile testing).

## 17.2 Step 1 — Set Up the Database

1. Open your Supabase project dashboard → **SQL Editor → New query**.
2. On a **fresh** project: open `database/janmitra_full_setup.sql`, copy all of
   it, paste into the SQL Editor, click **Run**.
3. On an **existing** project (with data): do NOT run `janmitra_full_setup.sql`
   (it drops tables). Instead run the individual `01` → `16` files in order;
   each is idempotent (safe to re-run).
4. In Supabase, go to **Authentication → Providers → Email** and turn **OFF**
   "Confirm email" (for demo/login ease).
5. **Enable Realtime** on the relevant tables (Database → Replication).
6. Set the secrets for edge functions (see Step 4).

> Note: because of the live-schema gap (Part 4.3), officers/departments/AI/
> safety/automation/SLA/audit tables are NOT created by the repo SQL. To fully
> replicate the live project, those tables must be created separately. For
> development of the *version-controlled* features, the repo SQL is enough.

## 17.3 Step 2 — Run the Mobile App

```bash
cd mobile
flutter pub get
cp .env.example .env   # then edit .env and fill in the values
flutter run
```

`.env` values needed:
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_ANON_KEY` — your Supabase anon/publishable key
- `MAPBOX_ACCESS_TOKEN` — your Mapbox token
- Firebase config (`FIREBASE_*`)

## 17.4 Step 3 — Run the Admin Dashboard

```bash
cd ADMIN/frontend
npm install
cp .env.example .env   # then edit .env
npm run dev
```

Open `http://localhost:5173`.

`.env` values needed:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAPBOX_ACCESS_TOKEN`

## 17.5 Step 4 — (Optional) Deploy the Push Edge Function

```bash
supabase functions deploy send-push-notifications
supabase secrets set FIREBASE_SERVICE_ACCOUNT=@path/to/service-account.json
```

Schedule the outbox drain in SQL:
```sql
SELECT cron.schedule('push-outbox', '* * * * *',
  $$SELECT net.http_post(...drain outbox...)$$);
```

## 17.6 Step 5 — (Optional) Run the Express Backend

```bash
cd ADMIN/backend
npm install
cp .env.example .env   # DATABASE_URL, JWT_SECRET, CORS_ORIGINS, CLOUDINARY_*
docker compose up -d db
npx prisma migrate deploy
npm run dev
```

Remember: this backend is **not wired to the admin frontend** — it is an
alternate/parallel implementation.

## 17.7 Demo Accounts

| Surface | Email | Password | Role |
|---------|-------|----------|------|
| Mobile | `aarav@janmitra.example` | `JanMitra123` | Citizen |
| Admin | `admin@janmitra.demo` | `Demo@1234` | System Admin |
| Admin | `dept@janmitra.demo` | `Demo@1234` | Department Admin |
| Admin | `officer@janmitra.demo` | `Demo@1234` | Officer |

> The database README lists `admin@janmitra.local` (stale); the actual login
> page uses `admin@janmitra.demo`.

## 17.8 Useful Commands

| Command | Where | Purpose |
|---------|-------|---------|
| `flutter run` | mobile | Run the app on a connected device/emulator |
| `flutter build apk --release` | mobile | Build a release Android APK |
| `npm run dev` | ADMIN/frontend | Start the admin dashboard (Vite) |
| `npm run build` | ADMIN/frontend | Type-check + build static `dist/` |
| `npm run typecheck` | ADMIN/frontend | Type-check only |
| `npm run dev` | ADMIN/backend | Start Express with watch mode |
| `npm run test` | ADMIN/backend | Run Vitest tests |
| `npm run verify` | ADMIN/backend | typecheck + lint + test + build |

---

# PART 18 — Glossary (Every Term Used in This Guide)

| Term | Meaning |
|------|---------|
| **App** | A piece of software that does a job for a user |
| **Frontend** | The part of an app the user sees and interacts with |
| **Backend** | The server-side logic that does the real work |
| **Database** | An organized store of data |
| **API** | The menu of requests a backend accepts |
| **REST API** | A popular API style using URLs and HTTP verbs |
| **RPC** | Remote Procedure Call — calling a named function on the server |
| **SDK** | Software Development Kit — a library that makes using a service easy |
| **Cloud** | Someone else's computer, accessed over the internet |
| **Authentication** | Proving who you are (login) |
| **Authorization** | Deciding what you are allowed to do |
| **RLS** | Row Level Security — per-row permissions in Postgres |
| **Realtime** | The server pushes updates the instant they happen |
| **WebSockets** | An always-open connection between app and server |
| **Trigger** | Database code that runs automatically on an event |
| **Stored procedure / function** | Reusable block of SQL code |
| **SQL** | The language used to talk to a database |
| **Table / Column / Row** | Like a spreadsheet's sheet / column / row |
| **Enum** | A predefined list of allowed values |
| **Idempotent** | Doing the same thing twice has the same result as once (no duplicates) |
| **Atomic** | All-or-nothing — either everything succeeds or nothing does |
| **Signed URL** | A temporary, authorized link to a private file |
| **Edge Function** | Small server-side code running close to the user |
| **Postgres** | A popular open-source database |
| **PostGIS** | Postgres extension for geography |
| **pg_trgm** | Postgres extension for fuzzy text similarity |
| **pg_cron** | Postgres scheduler (like a clock for jobs) |
| **Supabase** | Open-source backend-as-a-service (Postgres + Auth + Storage + Realtime) |
| **Flutter** | Google's framework for building mobile apps from one codebase |
| **Dart** | The language Flutter uses |
| **React** | A Facebook framework for building user interfaces |
| **Vite** | A fast dev tool and bundler for web apps |
| **TypeScript** | A typed version of JavaScript |
| **Tailwind CSS** | A utility-first CSS framework |
| **shadcn/ui** | A set of accessible React components built on Radix |
| **TanStack Query** | A library for fetching/caching server data in React |
| **Riverpod** | A state-management library for Flutter |
| **go_router** | A navigation library for Flutter |
| **Mapbox** | A provider of map tiles and geocoding |
| **FCM** | Firebase Cloud Messaging — push notifications |
| **JWT** | JSON Web Token — a compact login session token |
| **Prisma** | An ORM (talks to the DB via code instead of raw SQL) |
| **Express** | A Node.js web framework |
| **ORM** | Object-Relational Mapper — code-friendly database access |
| **SLA** | Service Level Agreement — a deadline for resolving an issue |
| **SOS** | Save Our Souls — an emergency signal |
| **KYC** | Know Your Customer — identity verification |
| **Aadhaar** | India's 12-digit national identity number |
| **SHA-256** | A one-way cryptographic hash function |
| **FCM token** | A device's registration ID for receiving push notifications |
| **Outbox pattern** | Write notifications to a table first, then a job sends them (reliable delivery) |
| **Repository / repo** | The project folder tracked by Git |
| **Migration** | A version-controlled change to the database schema |
| **Service role key** | A secret key with full database access (only in edge functions) |
| **Anon / publishable key** | A safe public key (limited by RLS) used in client apps |
| **app_metadata.role** | A secure field on a Supabase user holding their role |
| **Optimistic update** | Update the UI immediately, reconcile with the server afterward |
| **Cache invalidation** | Mark cached data as stale so it refetches |
| **Geofence** | A drawn geographic boundary (e.g., Bhopal city limits) |
| **Heatmap** | A map showing density of points with color intensity |
| **Clustering** | Grouping nearby map markers into a single marker at low zoom |
| **Gamification** | Adding game-like rewards (points, badges, levels) to an activity |
| **Civic Health Score** | A computed metric: resolution_rate × 0.6 + engagement_rate × 0.4 |

---

# Quick Reference — The Whole Project in One Page

**JanMitra** is a **gamified civic engagement platform for Bhopal**. Citizens
use a **Flutter mobile app** to report civic issues (photo + location +
category) in under a minute. Complaints flow through a transparent **lifecycle**
(SUBMITTED → AI_CHECKING → VERIFIED → ASSIGNED → IN_PROGRESS → RESOLVED →
CLOSED) with **AI-assisted evidence validation** (human-in-the-loop, never
auto-reject), **SLA tracking**, **department/officer assignment**, **community
verification**, and **notifications at every step**. Citizens earn **points,
badges, and levels** (anti-cheat: server-controlled). A **women-safety** suite
offers SOS with live location sharing, trusted contacts, safety check-in,
nearby safe places, and anonymous reporting. Municipal staff manage everything
via a **React + TypeScript admin dashboard** with a civic map, AI review queue,
SLA management, analytics, and an automation center. The backend is primarily
**Supabase** (Postgres + Auth + Storage + Realtime + Edge Functions); a parallel
**Express + Prisma** backend exists in the repo but is **not wired** to the
frontend. Maps use **Mapbox**; push uses **Firebase Cloud Messaging**.

**Critical things to remember:**
1. The admin frontend talks to **Supabase directly**, not to the Express backend.
2. Many tables (officers, departments, AI, safety, automation, SLA, audit) exist
   **only on the live Supabase project**, not in version-controlled SQL.
3. The `complaint_status` enum has ~19 values live, but only 6 in the repo.
4. **AI never auto-rejects** — failures route to a human.
5. **Gamification is server-controlled** — clients cannot award themselves
   points.

You now know the whole project. Welcome to JanMitra.

---

*This guide was generated by reading the actual repository at
`D:\Janmitra\JanMitra` (README, master project document, SRS, database README,
source folder structures, and package manifests). For the deepest detail on
any topic, see the matching document in the `docs/` folder (48 files, indexed
in the README).*
