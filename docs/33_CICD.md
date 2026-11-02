# JanMitra — CI/CD Documentation

> **Document version:** 1.0  
> **Generated:** 2026-09-30

> **Current state:** No CI/CD configuration file was found in the repository (no
> `.github/workflows/`, no `gitlab-ci.yml`, no `bitbucket-pipelines.yml`). The
> Express backend has a `verify` script (`typecheck && lint && test && build`)
> suitable as a CI gate. This document provides a **recommended** CI/CD
> architecture, clearly marked as recommended.

---

## 1. Current State
- **No CI/CD pipeline configured.**
- Express backend `package.json` has `verify` script (typecheck + lint + test + build) — can be run manually or in CI.
- Admin frontend has `build` (`tsc --noEmit && vite build`) + `typecheck` — no test/lint.
- Mobile has `flutter test` (minimal tests).
- No automated deployment config.

## 2. Recommended Git Workflow
- **Branching:** `main` (production), `develop` (staging), feature branches (`feature/*`), bugfix (`fix/*`), hotfix (`hotfix/*`).
- **Pull requests:** All changes via PR to `develop` (or `main` for hotfix). Require ≥1 review + CI green.
- **Code review:** Review for correctness, security (no secrets), RLS, and test coverage.
- **Conventional commits:** `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`.

## 3. Recommended Pipeline (GitHub Actions)

### 3.1 On every PR (build + test gate)
```yaml
# .github/workflows/ci.yml (RECOMMENDED — not currently present)
name: CI
on: [pull_request, push]
jobs:
  admin-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - working-directory: ADMIN/frontend
        run: |
          npm ci
          npm run typecheck
          npm run build
  admin-backend:
    runs-on: ubuntu-latest
    services:
      db:
        image: postgis/postgis:16-3.4
        env: { POSTGRES_PASSWORD: janmitra, POSTGRES_DB: janmitra_test }
        ports: ['5433:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - working-directory: ADMIN/backend
        run: |
          npm ci
          npx prisma migrate deploy
          npm run verify   # typecheck && lint && test && build
  mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.x' }
      - working-directory: mobile
        run: |
          flutter pub get
          flutter analyze
          flutter test
  database-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          # Basic SQL syntax check (optional: supabase db lint)
          echo "Lint SQL files"
```

### 3.2 On merge to main (deploy)
- Admin frontend → build → deploy `dist/` to static host.
- Admin backend → Docker build → deploy container.
- Mobile → build APK/AAB → upload to Play Store internal track.
- Edge functions → `supabase functions deploy`.
- Database → `supabase db push` (migrations) on staging first.

## 4. Environment Separation
- **Development:** local Supabase or dev project.
- **Staging:** separate Supabase project (or branch) for integration testing.
- **Production:** production Supabase project.

## 5. Secrets
- Never commit secrets. Use CI secrets (GitHub Actions secrets) + Supabase secrets (`supabase secrets set`).
- Use OIDC for cloud deploys where possible.
- Rotate JWT_SECRET, service accounts, Mapbox tokens periodically.

## 6. Rollback
- Database: Supabase PITR.
- Frontend: redeploy previous `dist/`.
- Mobile: rollback Play Store/TestFlight build.
- Edge function: redeploy previous version.
- Backend: redeploy previous Docker image.

## 7. Recommended Checks
- `tsc --noEmit` (admin frontend + backend).
- `eslint` (backend only currently).
- `flutter analyze` (mobile).
- `flutter test` / `vitest run` (tests).
- `npm run build` (frontend + backend).
- Supabase advisors (security + performance) after migrations.
- RLS policy tests (recommended — not yet present).
