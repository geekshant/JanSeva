# JanMitra — Testing Strategy

> **Document version:** 1.0  
> **Generated:** 2026-09-30

---

## 1. Current Test Coverage

| Surface | Framework | Files | Coverage |
|---------|-----------|-------|----------|
| Mobile (Flutter) | flutter_test | `mobile/test/` | Minimal (widget tests) |
| Admin frontend (React) | None | — | **No tests** |
| Admin backend (Express) | Vitest 2.1 + Supertest 7 | `tests/api.test.ts`, `tests/management.test.ts`, `tests/geospatial.test.ts` | ~3 files, happy paths + key errors, no coverage measurement |
| Database | — | — | No automated tests (idempotent SQL only) |

## 2. Recommended Testing Layers

### 2.1 Unit Testing
- **Mobile:** Flutter widget tests for reusable components (`AppButton`, `AppCard`, `StatusBadge`, `CategoryIcon`); unit tests for utils (`phone.dart`, `password.dart`, `aadhaar.dart`, `app_logger.dart`); repository tests with mocked Supabase client.
- **Admin frontend:** Vitest + React Testing Library for components (`StatusBadge`, `SlaBadge`, `AiAlertBadge`), service functions (`base.ts`, `complaints.ts`), `workflow.ts` permission helpers.
- **Admin backend:** Vitest unit tests for services (complaints.service, auth.service, sla.utils, points.utils), status transition matrix.

### 2.2 Widget/Component Testing
- Mobile: screen-level widget tests (Login, Report Issue wizard steps, Complaint Detail, Safety SOS countdown).
- Admin: component render tests (ComplaintsTable, ComplaintFiltersBar, AiVerificationPanel, ChangeStatusDialog).

### 2.3 Integration Testing
- Mobile: end-to-end flows with a test Supabase project (register → report → track → verify).
- Admin frontend: MSW (Mock Service Worker) for Supabase RPC mocking; page integration tests.
- Admin backend: Supertest HTTP integration tests (existing — expand coverage to uploads, refresh, firebase, change-password, reopen, duplicate, leaderboard, transactions, analytics sub-endpoints).

### 2.4 API Testing
- Supabase RPCs: test each RPC with authenticated/anon/service-role clients; verify RLS enforcement; verify idempotency; verify SECURITY DEFINER behavior.
- Express: test all 57 endpoints (existing covers ~main paths).

### 2.5 Database Testing
- RLS policy tests: for each table, test SELECT/INSERT/UPDATE/DELETE as owner, other citizen, officer, admin, anon.
- Trigger tests: verify `handle_new_user`, `record_status_change`, `protect_reputation_columns`, `award_points` idempotency, `check_and_award_badges`.
- Constraint tests: title length, severity enum, status enum, level check, phone uniqueness, email uniqueness, Aadhaar hash.

### 2.6 RLS Testing
- Critical: verify citizens can only see own complaints/notifications/rewards/badges; verify no "view all complaints" leak; verify nearby queries return privacy-safe projections; verify admin can read all; verify no client can write points/notifications.

### 2.7 Realtime Testing
- Subscribe, receive event, dedup, cleanup on dispose, reconnect.
- Mobile: `complaintRealtimeProvider`, `notificationsChangesProvider`, `nearbyRealtimeProvider`.
- Admin: `useRealtimeSubscription` dedup, `RealtimeContext` state.

### 2.8 AI Validation Testing
- Mock `ai-evidence-verification` edge function: PASS/REVIEW/FAIL/error/timeout.
- Verify AI failure never auto-rejects (routes to human review).
- Verify `retry_stuck_ai_jobs` re-invokes edge function.
- Verify `officer_review_complaint` override updates AI table + status + audit + notifications.

### 2.9 Map Testing
- GPS permission grant/deny; Bhopal geofence (inside/outside); marker clustering; heatmap rendering; radius filter; "search this area"; realtime refresh.

### 2.10 Notification Testing
- Trigger → `notifications` row created; push outbox drained; FCM mock; `notify_push` opt-out; invalid token pruning; mark read optimistic + rollback.

### 2.11 Security Testing
- RLS bypass attempts; JWT tampering; service_role key not in client; reputation manipulation attempt rejected; SQL injection on raw SQL; XSS; CSRF (Express cookies); rate limiting.

### 2.12 Performance Testing
- Nearby query (≤100 results, <2s); dashboard (≤500 rows, <3s); leaderboard (limit 50); realtime subscription scalability.

### 2.13 Regression Testing
- Run full suite on every PR; snapshot tests for UI; status transition matrix tests.

### 2.14 UAT
- Citizen journey (register → report → track → verify → safety).
- Officer journey (login → review AI → assign → resolve).
- Admin journey (dashboard → analytics → SLA → departments → automation).

### 2.15 Accessibility Testing
- Mobile: screen reader (TalkBack/VoiceOver), font scale, high contrast, touch targets ≥48dp.
- Admin: keyboard navigation, ARIA labels, contrast.

### 2.16 Mobile Device Testing
- Android (min API 24) + iOS; low-end devices; network conditions (3G, offline).

### 2.17 Browser Testing
- Admin: Chrome, Firefox, Safari, Edge; responsive (mobile/tablet/desktop).

## 3. Test Environment
- **Express:** dedicated `janmitra_test` PostGIS DB (Docker port 5433); `resetDb()` truncates before each suite; serial execution.
- **Supabase:** use a development branch (Supabase branching) or a separate test project; never test against production.
- **Mobile:** Flutter test runner; integration_test for device tests.

## 4. CI Integration
- Run `typecheck` + `lint` + `test` + `build` on every PR (Express `verify` script).
- Mobile: `flutter test`.
- Admin frontend: **add** `vitest run` (currently no test script).
- Database: add RLS policy test suite.

## 5. Gaps
- Admin frontend: no tests, no linter, no test script.
- No coverage measurement anywhere.
- No RLS automated tests.
- No realtime automated tests.
- No AI validation automated tests.
- No accessibility automated tests.
