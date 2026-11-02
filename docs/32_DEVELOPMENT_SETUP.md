# JanMitra — Local Development Setup

> **Document version:** 1.0  
> **Generated:** 2026-09-30

---

## 1. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Flutter | 3.x (Dart 3.13+) | Mobile app |
| Dart | 3.13+ | Mobile |
| Node.js | ≥ 20 (22 recommended) | Admin frontend + backend |
| npm | (bundled with Node) | Package manager |
| Android Studio | latest | Android emulator/device |
| Xcode | latest (macOS) | iOS build |
| Supabase CLI | latest | Edge functions, local stack (optional) |
| Git | latest | Version control |
| Docker | latest | Admin backend DB (optional) |

## 2. Clone & Structure
```
JanMitra/
├── ADMIN/
│   ├── backend/      # Express + Prisma (optional parallel)
│   └── frontend/     # React + Vite admin dashboard
├── database/         # Supabase public-schema SQL
├── mobile/           # Flutter citizen app
└── supabase/
    └── functions/    # Edge functions
```

## 3. Supabase Setup (Shared Backend)
1. Create a Supabase project (or use Supabase CLI local stack: `supabase init && supabase start`).
2. Get **Project URL** + **anon/publishable key** (Dashboard > Project Settings > API).
3. SQL Editor → run `database/01_schema.sql` → `02` → ... → `16` in order (all idempotent). Or run `janmitra_full_setup.sql` on a fresh project.
4. Authentication > Providers > Email > **Confirm email: OFF**.
5. Enable Realtime (Database > Replication) + add tables to publication.
6. Enable extensions: `create extension if not exists postgis;` (in `extensions` schema — done by `01`), `pg_trgm` (`11`), `pgcrypto` (`13`). Enable `pg_net` + `pg_cron` in dashboard if using AI retry.
7. Create demo user: Dashboard > Authentication > Users > Add user → `aarav@janmitra.example` / `JanMitra123` > Auto Confirm.
8. (For admin) Set `app_metadata.role` to `SYSTEM_ADMIN` on your admin user.

## 4. Mobile App
```bash
cd mobile
flutter pub get
cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_ANON_KEY, MAPBOX_ACCESS_TOKEN, FIREBASE_*
flutter run            # emulator or device
```
- `.env` is bundled as an asset (`flutter_dotenv`).
- Android: configure `android/app/google-services.json` (Firebase). iOS: `GoogleService-Info.plist`.
- Placeholder mode: if `.env` missing or values empty, app boots gracefully (Supabase no-op, FCM no-op).

## 5. Admin Frontend
```bash
cd ADMIN/frontend
npm install
cp .env.example .env   # fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_MAPBOX_ACCESS_TOKEN
npm run dev            # http://localhost:5173
```
- `npm run build` → `dist/` (production).
- `npm run typecheck` → tsc --noEmit.
- **No test or lint script** (gap).

## 6. Admin Backend (Optional, Parallel)
```bash
cd ADMIN/backend
npm install
cp .env.example .env   # DATABASE_URL, JWT_SECRET, CORS_ORIGINS, CLOUDINARY_*, (FIREBASE_*)
# Start PostGIS:
docker compose up -d db          # PostGIS on :5433
npx prisma migrate deploy         # apply migrations
npx prisma db seed                 # seed demo data
npm run dev                        # hot-reload on :8080
```
- `npm run verify` → typecheck + lint + test + build.
- `npm test` → Vitest.
- Requires `DATABASE_URL` pointing to Supabase pooler with `?schema=admin` + `sslrootcert=supabase-ca.crt` (run `node extract-pooler-cert.mjs` to generate cert).

## 7. Edge Functions
```bash
cd supabase/functions/send-push-notifications
# Deploy:
supabase functions deploy send-push-notifications
# Set secret:
supabase secrets set FIREBASE_SERVICE_ACCOUNT='{...}'
```

## 8. Seed Data
- `database/05_seed_data.sql` → categories (10), badges (7 initial).
- `database/07_reputation.sql` → reward_rules (5), level_config (5), badges rework (6 final).
- Express `prisma/seed.ts` → demo departments (Roads, Sanitation, Safety), users (admin/officer/citizen), badges (7), sample complaints.
- Admin demo mode: `seed_demo_complaints` RPC → 15 Bhopal complaints.

## 9. Demo Accounts
- Mobile: `aarav@janmitra.example` / `JanMitra123`.
- Admin frontend: `admin@janmitra.demo` / `Demo@1234` (System Admin), `dept@janmitra.demo` (Department Admin), `officer@janmitra.demo` (Officer).
- Express backend (Prisma seed): see `SEED_DEMO_ADMIN_*` env.

## 10. Running Everything Together
1. Supabase project configured (steps 3).
2. `cd mobile && flutter run` (emulator).
3. `cd ADMIN/frontend && npm run dev` (admin dashboard).
4. (Optional) `cd ADMIN/backend && npm run dev` (Express API).
5. Edge functions deployed.

## 11. Common Issues
- `PGRST202/PGRST205` → run the missing migration (`13_aadhaar_kyc.sql`, etc.).
- Realtime no events → add tables to Realtime publication.
- Map blank → check `MAPBOX_ACCESS_TOKEN`.
- Push not delivered → check `FIREBASE_SERVICE_ACCOUNT` secret + pg_cron schedule.
- Express schema mismatch → raw SQL queries `public.complaints` while ORM uses `admin.*` (known issue).
