# JanMitra — Deployment Guide

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Never expose real secrets.** All secrets below are placeholders.

---

## 1. Architecture Overview
- **Supabase project** (hosted): Postgres + Auth + Storage + Realtime + Edge Functions.
- **Mobile app** (Flutter): built to APK/AAB (Android) / IPA (iOS).
- **Admin frontend** (React/Vite): built to static `dist/` (served by any static host / Supabase hosting / Vercel).
- **Admin backend** (Express/Prisma): Docker container (optional; not wired to admin frontend).
- **Edge functions**: `send-push-notifications` (+ `ai-evidence-verification` [S], `download-my-data` [S]).

## 2. Development Environment
See `32_DEVELOPMENT_SETUP.md`.

## 3. Environment Variables

### Mobile (`mobile/.env`)
```
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
MAPBOX_ACCESS_TOKEN=YOUR_MAPBOX_TOKEN
FIREBASE_API_KEY=...
FIREBASE_APP_ID=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_PROJECT_ID=...
FIREBASE_AUTH_DOMAIN=...   (optional)
FIREBASE_STORAGE_BUCKET=... (optional)
APP_ENV=development
```

### Admin Frontend (`ADMIN/frontend/.env`)
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
VITE_MAPBOX_ACCESS_TOKEN=YOUR_MAPBOX_TOKEN
VITE_MAP_MODE=production
VITE_DATA_MODE=production
```

### Admin Backend (`ADMIN/backend/.env`)
```
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://USER:PASS@aws-0-REGION.pooler.supabase.com:6543/postgres?schema=admin&pgbouncer=true&connection_limit=10&sslmode=require&sslrootcert=supabase-ca.crt
JWT_SECRET=<>=32 chars>
CORS_ORIGINS=https://admin.janmitra.example
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FIREBASE_SERVICE_ACCOUNT=<base64 json>   (optional, if AUTH_MODE=firebase)
```

### Edge Functions (Supabase secrets)
```
SUPABASE_URL=...                        (auto-injected)
SUPABASE_SERVICE_ROLE_KEY=...            (auto-injected)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'   (manual: supabase secrets set)
```

## 4. Supabase Setup
1. Create Supabase project (region close to users).
2. SQL Editor → run `database/janmitra_full_setup.sql` (fresh) OR incremental numbered files (existing). See `database/README.md`.
3. Authentication > Providers > Email > **Confirm email: OFF** (per project).
4. Apply live-only schema (officers, departments, AI tables, safety, automation, SLA rules, audit, etc.) — **these are NOT in version-controlled SQL**; apply from the live project's history or recreate.
5. Storage: `complaint_images` (private) + `avatars` (public) created by `04_storage.sql` + `09_avatars_storage.sql`.
6. Extensions: postgis, pg_trgm, pgcrypto (created by SQL). pg_net + pg_cron (enable in dashboard; needed for AI retry).
7. Schedule AI retry: `SELECT cron.schedule('retry-ai-jobs', '*/2 * * * *', 'SELECT public.retry_stuck_ai_jobs()');`

## 5. Database Setup
- Run migrations in order (01→16). All idempotent.
- `janmitra_full_setup.sql` drops & recreates — **never run on a project with data**.
- Seed: categories (10), badges (6), reward_rules (5), level_config (5) via `05` + `07`.

## 6. Storage Setup
- `complaint_images`: private, mimes image/jpeg|png|webp, 10MB, owner-scoped + admin policies.
- `avatars`: public, mimes image/jpeg|png|webp, 5MB, owner-scoped.

## 7. Authentication Setup
- Email provider ON; Confirm email OFF.
- Phone login via `resolve_phone_login` RPC (no Supabase phone auth needed).
- Admin users: set `app_metadata.role` to `SYSTEM_ADMIN`/`DEPARTMENT_ADMIN`/`OFFICER` via dashboard or admin API.

## 8. Realtime Setup
- Enable Realtime (Supabase dashboard > Database > Replication).
- Add tables to Realtime publication (complaints, complaint_status_history, complaint_images, notifications, etc.).

## 9. Google Maps / Mapbox Setup
- **Mapbox:** Create account → access token → set `MAPBOX_ACCESS_TOKEN` (mobile) + `VITE_MAPBOX_ACCESS_TOKEN` (admin).
- Google Maps: NOT used (legacy key unused).

## 10. FCM Setup
1. Firebase project → add Android + iOS apps → get `google-services.json` (Android) + `GoogleService-Info.plist` (iOS).
2. Set mobile `FIREBASE_*` env.
3. Generate service account JSON → `supabase secrets set FIREBASE_SERVICE_ACCOUNT='{...}'`.
4. Deploy `send-push-notifications` edge function.
5. Schedule: `SELECT cron.schedule('push-outbox', '* * * * *', $$SELECT net.http_post(url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notifications', headers:='{"Authorization":"Bearer YOUR_SERVICE_ROLE_KEY","Content-Type":"application/json"}'::jsonb, body:='{}'::jsonb)$$);`

## 11. Edge Function Deployment
```
supabase functions deploy send-push-notifications
# (verify_jwt defaults to true — invoke with service_role key)
```
AI function [S]: `supabase functions deploy ai-evidence-verification` (not in repo — deploy from source).

## 12. Admin Backend Deployment (Optional)
```bash
cd ADMIN/backend
docker compose up -d --build   # db + api
# OR
npm run build && npm start
```
Dockerfile multi-stage; runs `prisma migrate deploy` then `node dist/server.js`.

## 13. Admin Frontend Deployment
```bash
cd ADMIN/frontend
npm run build   # tsc --noEmit && vite build → dist/
# Serve dist/ via static host (Vercel/Netlify/Supabase hosting/Nginx)
```

## 14. Mobile Build
### Android
```bash
cd mobile
flutter pub get
flutter build apk --release     # or appbundle
```
Configure `android/app/google-services.json`.

### iOS
```bash
cd mobile
flutter pub get
flutter build ios --release
# Open ios/ in Xcode → configure signing → archive
```
Configure `ios/Runner/GoogleService-Info.plist`.

## 15. Production Configuration
- `APP_ENV=production` (mobile); `NODE_ENV=production` (backend).
- JWT_SECRET ≥32 chars.
- CORS_ORIGINS restricted.
- HTTPS (enforce via host).
- Enable Supabase MFA for admin accounts.

## 16. Domain Configuration
- Point admin domain to static host.
- HTTPS via host (Let's Encrypt / host cert).

## 17. Monitoring
- Supabase dashboard (DB health, auth, storage, functions logs).
- Edge function logs.
- `supabase_get_advisors` (security/performance).
- pg_cron job status.
- Express: Pino structured JSON logs; `/health` endpoint.

## 18. Rollback
- Database: Supabase point-in-time recovery (PITR).
- Admin frontend: redeploy previous `dist/`.
- Mobile: rollback Play Store / TestFlight build.
- Edge function: `supabase functions deploy` previous version.

## 19. Backup
- Supabase PITR (daily + continuous WAL).
- Storage: Supabase handles.
- Express (admin schema): `pg_dump` of `admin` schema.
- Code: git.

## 20. Disaster Recovery
- Supabase multi-region read replicas (if needed).
- Document restore-from-PITR procedure.
- Edge function secrets stored securely (not in repo).
