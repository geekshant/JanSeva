# JanMitra Official Dashboard (React frontend)

Web dashboard for civic officials and administrators of JanMitra — review, assign,
track and resolve citizen complaints in real time.

## Tech stack

- **Vite 5 + React 18 + TypeScript 5**
- **Tailwind CSS 3** (design tokens in `src/index.css`)
- **React Router 6** with role-based route guards
- **Recharts** for analytics visualizations
- **socket.io-client** for live complaint/notification updates

## Getting started

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` and
`/socket.io` to the backend on `http://localhost:8080`.

You can override the backend URL via `VITE_API_BASE_URL` / `VITE_SOCKET_URL`
(see `.env.example`).

## Demo accounts

Matching the backend seed (`Password123` for all):

| Email                     | Role        |
| ------------------------- | ----------- |
| `admin@janmitra.local`    | SYSTEM_ADMIN |
| `roads.admin@janmitra.local` | DEPARTMENT_ADMIN |
| `roads.officer@janmitra.local` | OFFICIAL |

## Layout map

| Route              | Access                            |
| ------------------ | --------------------------------- |
| `/`                | Officials + admins                |
| `/complaints`      | Officials + admins                |
| `/complaints/:id`  | Officials + admins                |
| `/sla-breaches`    | Officials + admins                |
| `/notifications`   | Officials + admins                |
| `/analytics`       | Admins only                       |
| `/departments`     | Admins only                       |
| `/users`           | SYSTEM_ADMIN only                 |
| `/profile`         | Officials + admins                |

## Real-time updates

The app keeps a single Socket.IO connection (authenticated with the access
token) while logged in. The queue, dashboard and complaint detail page refresh
automatically on `complaint:*`, `notification:new` and `dashboard:stats-updated`
events emitted by the backend.

## Scripts

```bash
npm run dev        # dev server with proxies
npm run build      # type-check (tsc -b) + production build
npm run preview    # preview the production build
```