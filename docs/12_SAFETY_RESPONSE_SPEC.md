# JanMitra — Safety & Police Response Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30

> **Implementation status:** All citizen safety features (SOS, trusted contacts,
> safety check-in, nearby safe places, anonymous report) are **Implemented** in the
> mobile app and call Supabase RPCs (`trigger_sos`, `cancel_sos`, `share_location`,
> `create_safety_checkin`, `complete_safety_checkin`, `find_nearby_safety_places`,
> `submit_anonymous_report`, `fetch_safety_contacts`, `add_safety_contact`,
> `update_safety_contact`, `delete_safety_contact`). The backing tables
> (`safety_alerts`, `safety_incidents`, `safety_contacts`, `safety_checkins`,
> `safe_places`, `anonymous_reports`) are **referenced but NOT created** in
> version-controlled SQL — they exist on the live project. Admin safety alert
> management (acknowledge/resolve) is **Implemented** via `get_active_safety_alerts`,
> `acknowledge_safety_alert`, `resolve_safety_incident`, `get_safety_incident_location_shares`
> RPCs. Full closest-police-officer/station auto-dispatch is **specified but not
> confirmed implemented**.

---

## 1. Women Safety Features

### 1.1 SOS
- **Trigger:** Long-press pulsing button → 3-2-1 countdown (prevents accidental triggers).
- **Action:** `trigger_sos` RPC (lat/lng/address/message) → creates `safety_incident` (type SOS, status ACTIVE).
- **Live location sharing:** `share_location` RPC every 15s (accuracy/speed/heading).
- **Cancel:** `cancel_sos` RPC → status CANCELLED.
- **Notification:** Trusted contacts + responders notified; admin Safety Alerts page shows active alert with buzzer.

### 1.2 Trusted Contacts
- Max 3 contacts (enforced by UI + RPC).
- CRUD: `fetch_safety_contacts`, `add_safety_contact` (name, phone +91 validation, relationship), `update_safety_contact`, `delete_safety_contact`.
- Notified during SOS.

### 1.3 Safety Check-in
- `create_safety_checkin` RPC (interval 15/30/60/120 min) → `safety_checkins` (status pending).
- Countdown timer in app.
- "I'm safe" → `complete_safety_checkin` (status checked_in).
- **Missed check-in → auto-triggers SOS** via `trigger_sos` RPC with message.

### 1.4 Nearby Safe Places
- `find_nearby_safety_places` RPC (PostGIS, radius 5km, limit 20).
- Types: POLICE, HOSPITAL, SAFE_PLACE.
- Call button (`url_launcher` tel:), open Google Maps directions.

### 1.5 Anonymous Report
- `submit_anonymous_report` RPC (message + optional lat/lng/address).
- No personal identifier attached.

### 1.6 Emergency Call
- 112 via `url_launcher` (tel:112). No DB.

## 2. Safety Incident Model

| Field | Description |
|-------|-------------|
| `id` | incident id |
| `type` | SOS / CHECK_IN / ANONYMOUS_REPORT |
| `status` | ACTIVE / RESPONDING / RESOLVED / CANCELLED / EXPIRED |
| `user_id` | citizen (SOS/check-in) or null (anonymous) |
| `location` | lat/lng/address |
| `message` | citizen message |
| `created_at` | |
| `acknowledged_at` / `resolved_at` | responder timestamps |

## 3. Police / Safety Responder Flow (Admin)

For acknowledged safety alerts (specified flow):

1. Determine complaint/report location.
2. Display location in alert details (Google Maps link in admin).
3. Find nearby eligible police officers [S].
4. Find relevant police station(s) [S].
5. Assign/notify appropriate responders according to configured rules [S].
6. Record assignment.
7. Notify responders.
8. Track acknowledgement (`acknowledge_safety_alert`).
9. Track response.
10. Track resolution (`resolve_safety_incident`).
11. Maintain audit history.

**Implemented:** Steps 1–2 (location display), 8 (acknowledge), 10 (resolve), 11 (audit). Steps 3–7 (auto-dispatch of closest police officer/station) are **specified but not confirmed implemented** — currently responders manually view and acknowledge alerts.

## 4. Admin Safety Alerts Page

- `get_active_safety_alerts` RPC → active alerts list.
- Flashing banner when active alerts exist.
- Alert cards: user info, location (Google Maps link), time, message, trusted contacts (with call links), acknowledge/resolve actions.
- Buzzer: loud 10s two-tone siren on new active alert; stops when no active alerts remain. Test/mute/unmute controls.
- Realtime: subscribes to `safety_alerts` (INSERT/UPDATE) + `safety_incidents` (*). 15s polling backup.
- Urgency levels: critical (>10 min active), urgent, normal.
- `get_safety_incident_location_shares` RPC → live location trail.

## 5. Privacy

- **Do not expose unnecessary sensitive citizen information.**
- SOS location shared only with trusted contacts + responders.
- Anonymous reports carry no personal identifier.
- Location trail access restricted to responders/admins.
- Citizen can clear location history (`clear_location_history` RPC) and set location precision (exact/block/ward/city).
