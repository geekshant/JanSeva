# JanMitra — Realtime Architecture Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Implementation status:** Implemented (Supabase Realtime `postgres_changes` over WebSocket).

---

## 1. Realtime System

Both the mobile app (Flutter `realtime_client`) and admin frontend
(`@supabase/supabase-js` realtime) use **Supabase Realtime** — Postgres changes
broadcast over a single multiplexed WebSocket. There is **no Socket.IO on the
Supabase path** (Socket.IO exists only in the parallel Express backend, which is
not wired to the admin frontend).

## 2. Channels & Subscriptions

### 2.1 Mobile App

| Provider | Channel | Tables/Events | Filter | Cleanup | Purpose |
|----------|---------|---------------|--------|---------|---------|
| `complaintRealtimeProvider` | `complaint-lifecycle:$profileId` | `complaints` ALL; `complaint_status_history` INSERT; `resolution_evidence` INSERT; `community_verifications` INSERT | complaints: server `user_id=profileId`; others: client-side by fetched IDs | `controller.close()` + `channel.unsubscribe()` | Emits semantic events (created/statusChanged/assigned/reopened/rejected/evidenceSubmitted/verificationUpdate) |
| `realtimeRefresherProvider` | (watches above) | — | — | — | Invalidates home/myComplaints/rewards |
| `complaintDetailRealtimeProvider` | (watches above) | — | — | auto-dispose on pop | Invalidates complaint detail |
| `notificationsChangesProvider` | `notifications:user:$profileId` | `notifications` ALL | server `user_id=profileId` | close + unsubscribe | Notification feed refresh |
| `nearbyRealtimeProvider` | `nearby-complaints-realtime` | `complaints` ALL; `complaint_images` ALL | none | `removeChannel` + close | 500ms-debounced nearby+heatmap refetch |

### 2.2 Admin Frontend

**Global** (`useGlobalRealtime` in AppShell) — subscribes to all major tables and
invalidates TanStack Query caches:
- `complaints` (*) → complaints, dashboard, analytics, sla, map, gamification
- `complaint_status_history` (INSERT) → dashboard, complaints
- `complaint_images` (INSERT) → complaints
- `notifications` (*) → notifications
- `profiles` (UPDATE) → users, gamification, dashboard
- `rewards` (INSERT) → users, gamification
- `user_badges` (INSERT) → users, gamification
- `departments`, `officers`, `badges`, `reward_rules`, `resolution_evidence`,
  `community_verifications`, `civic_incidents`, `duplicate_links`,
  `automation_audit_log`, `automation_executions`, `automation_rules` (*) →
  respective caches
- `safety_alerts` (INSERT/UPDATE), `safety_incidents` (*) → safety + buzzer

**Page-level:**
| Hook | Table(s) | Event | Filter |
|------|----------|-------|--------|
| `useComplaintsRealtime` | `complaints` | * | — |
| `useComplaintDetailRealtime` | `complaints` | UPDATE | `id=eq.{id}` |
| `useComplaintHistoryRealtime` | `complaint_status_history` | INSERT | `complaint_id=eq.{id}` |
| `useComplaintImagesRealtime` | `complaint_images` | INSERT | `complaint_id=eq.{id}` |
| `useNewComplaintsRealtime` | `complaints` | INSERT | — |
| `useActivityFeedRealtime` | `complaint_status_history` | INSERT | — |
| `useNotificationsRealtime` | `notifications` | * | `user_id=eq.{id}` |
| `useSlaRealtime` | `complaints` | * | — |
| `useDepartmentsRealtime` | `departments` | * | — |
| `useOfficersRealtime` | `officers` | * | — |
| `useAutomationRealtime` | `automation_audit_log`, `automation_executions` | * | — |
| `useSafetyRealtime` | `safety_alerts`, `safety_incidents` | * | — |
| `useNavCounts` | `complaints`, `complaint_ai_verification`, `safety_alerts`, `safety_incidents` | * | — |

## 3. Database Events

All three event types are used: INSERT, UPDATE, DELETE (via `eq`/`in`/`neq` filters or unfiltered `*`).

## 4. Connection Lifecycle

- Mobile: subscriptions stay alive while watched (MainShell watches complaint + notification refreshers for the whole session; MapScreen watches nearby). Auto-dispose on screen pop (e.g., complaint detail).
- Admin: `useRealtimeSubscription` hook — unique channel names per instance (counter), event-ID dedup (Set, max 500), cleanup on unmount.

## 5. Cleanup

- Mobile: `ref.onDispose` → `controller.close()` + `channel.unsubscribe()` (or `removeChannel`).
- Admin: unmount cleanup → unsubscribe channel.

## 6. Reconnection

- Supabase socket-level auto-reconnect. Admin `RealtimeContext` monitors WebSocket state (connected/disconnected/connecting/error) with 3s reset. TopNav `RealtimeIndicator` (green/amber/red).
- Mobile logs `closed`/`timedOut` statuses.

## 7. Duplicate Subscription Prevention

- Mobile: dedup by `commit_timestamp + eventType + record id` (bounded sets 200–300).
- Admin: `useRealtimeSubscription` event-ID dedup (Set, max 500); unique channel names per instance.

## 8. React / Flutter Lifecycle

- Flutter: `ProviderScope` + autoDispose providers; `ref.onDispose` cleanup.
- React: `useEffect` cleanup on unmount; TanStack Query cache invalidation on events.

## 9. Error Handling

- Mobile: socket closed/timedOut logged; providers surface errors via `.when(error:)`.
- Admin: `RealtimeContext` tracks error state; `ErrorBoundary` at top.

## 10. Security

- Realtime respects RLS — clients only receive events for rows they can SELECT.
- Server-side filters (e.g., `user_id=eq.{profileId}`) limit noise; client-side filtering adds a second layer.

## 11. Known Failure Scenarios & Solutions

| Scenario | Symptom | Solution |
|----------|---------|----------|
| WebSocket disconnect | Stale data | Auto-reconnect (Supabase); admin indicator; mobile logs |
| Missed events during disconnect | Data out of sync | TanStack Query refetchOnWindowFocus (admin); manual refresh (mobile) |
| Too many subscriptions | Performance | Dedup sets; bounded channels; auto-dispose |
| Duplicate events | Double refresh | Event-ID dedup (commit_timestamp + event + id) |
| RLS blocks event | Citizen doesn't see others' complaints | By design (privacy) |
| Filter mismatch | No events | Verify column name + value type match |
