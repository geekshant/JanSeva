# JanMitra Backend API

Admin-web dashboard backend for **JanMitra** — a citizen complaint management
platform. Express + TypeScript on PostgreSQL/PostGIS with Socket.IO realtime
events.

## Tech stack

- **Runtime:** Node.js 22, TypeScript (strict)
- **Framework:** Express 4, Socket.IO
- **Database:** PostgreSQL 16 + PostGIS (geography columns, nearest-neighbour
  and bounds queries in pure SQL)
- **ORM / migrations:** Prisma 5
- **Auth:** JWT access tokens + opaque, hashed refresh tokens; optional
  Firebase ID-token verification (`AUTH_MODE=firebase`)
- **Validation:** Zod
- **Images:** Cloudinary signed uploads
- **Observability:** pino + pino-http (JSON logs), request-id correlation
- **Tests:** Vitest + Supertest against a dedicated `janmitra_test` database

## Modules / route groups

| Area         | Routes                                                          |
| ------------ | --------------------------------------------------------------- |
| auth         | register, login, refresh, logout, me, change-password, profile  |
| users        | admin list/get/create/update/delete                              |
| departments  | admin CRUD + overview                                            |
| complaints   | create, list (status/category/priority/SLA/sort=nearest), map,   |
|              | nearby, clusters, tracking code lookup, status transitions,      |
|              | assignment, comments, verify, reopen, images, SLA breaches       |
| notifications| list, mark read, unread count, FCM device tokens                 |
| rewards      | my rewards, leaderboard, transactions, badge catalog             |
| analytics    | summary, categories, statuses, priorities, departments, trends,  |
|              | hot-zones                                                        |
| uploads      | Cloudinary presign + confirm/attach                              |

Every response uses an envelope:

```json
{ "success": true, "data": { ... }, "message": "..." }
```

Errors use `{ "success": false, "error": { "code", "message", "details" } }`.

## Quick start

```bash
npm install
cp .env.example .env        # edit DATABASE_URL, ports, secrets

docker compose up -d db     # PostGIS on localhost:5433
npx prisma migrate deploy   # apply migrations
npx prisma db seed          # demo users + sample complaints
npm run dev                 # http://localhost:8080
```

### Prisma + PostGIS

The `complaints.location` column is `geography(Point,4326)` and is kept in sync
with `latitude`/`longitude` by a DB trigger defined in
`prisma/migrations/20260922181000_postgis_geography/migration.sql`.

### Demo users (from seed, password `Password123`)

| Role              | Email                               |
| ----------------- | ----------------------------------- |
| SYSTEM_ADMIN      | admin@janmitra.local                |
| DEPARTMENT_ADMIN  | roads.admin@janmitra.local          |
| OFFICIAL          | roads.officer@janmitra.local        |
| CITIZEN           | citizen.demo@janmitra.local         |

## Testing

```bash
npm test
```

Tests run against `janmitra_test` (created in the same PostGIS container):

```bash
docker exec janmitra-postgis psql -U janmitra -d janmitra -c "CREATE DATABASE janmitra_test;"
DATABASE_URL=postgresql://janmitra:janmitra@localhost:5433/janmitra_test npx prisma migrate deploy
```

## Code quality

```bash
npm run typecheck
npm run lint
npm run build
```

## Deployment

`Dockerfile` builds a slim production image; `docker-compose.yml` runs the
PostGIS database plus the API. Set these env vars on the host:

| Variable                    | Description                                   |
| --------------------------- | --------------------------------------------- |
| `DATABASE_URL`              | Postgres connection string (set automatically)|
| `JWT_SECRET`                | Long random secret for tokens                 |
| `AUTH_MODE`                 | `jwt` (default) or `firebase`                 |
| `CLOUDINARY_CLOUD_NAME`     | Cloudinary account name                       |
| `CLOUDINARY_API_KEY`        | Cloudinary API key                            |
| `CLOUDINARY_API_SECRET`     | Cloudinary API secret                         |
| `CORS_ORIGINS`              | Comma separated allowed origins               |

```bash
docker compose up -d --build
```