# JanMitra — Data Dictionary

> **Document version:** 1.0  
> **Generated:** 2026-09-30

> Field-by-field dictionary for the important tables. Created tables are from
> version-controlled SQL; referenced-only tables are labeled **[S]** and documented
> from inferred usage. Security classification: **Public** (anyone), **Authenticated**
> (signed-in), **Owner** (own row only), **Admin** (admin role), **Service**
> (service_role/trigger only).

---

## profiles

| Field | Type | Null | Default | Meaning | Validation | Example | Security | Module |
|-------|------|------|---------|---------|------------|---------|----------|--------|
| id | uuid | NO | gen_random_uuid() | Profile PK | — | uuid | Owner/Admin | All |
| auth_user_id | uuid | NO | — | FK to auth.users | unique | uuid | Owner | Auth |
| name | text | NO | — | Citizen name | 2–80 chars (app) | "Priya" | Owner | Profile |
| email | text | YES | — | Email | unique idx lower(btrim) | "priya@x.com" | Owner | Auth |
| phone | text | YES | — | Mobile (10-digit) | unique idx normalize_phone | "9876543210" | Owner | Auth |
| avatar_url | text | YES | — | Avatar storage URL | — | url | Owner/Public | Profile |
| points | integer | NO | 0 | Civic reputation points | >=0 check dropped (07) | 250 | Owner | Gamification |
| level | integer | NO | 1 | Civic level | >=1 | 2 | Owner | Gamification |
| city | text | YES | — | City | — | "Bhopal" | Owner | Profile |
| ward | text | YES | — | Ward | — | "Ward 5" | Owner (privacy_show_ward) | Profile/Map |
| notify_push | boolean | NO | true | Push notification opt-in | — | true | Owner | Notifications |
| notify_email | boolean | NO | true | Email opt-in | — | true | Owner | Notifications |
| notify_in_app | boolean | NO | true | In-app opt-in | — | true | Owner | Notifications |
| privacy_show_leaderboard | boolean | NO | true | Leaderboard opt-in | — | true | Owner | Gamification |
| privacy_show_ward | boolean | NO | true | Ward visibility | — | true | Owner | Profile |
| created_at | timestamptz | NO | now() | Creation time | — | ts | Owner | All |
| updated_at | timestamptz | NO | now() | Update time | trigger | ts | Owner | All |

## categories

| Field | Type | Null | Default | Meaning | Example | Security |
|-------|------|------|---------|---------|---------|----------|
| id | uuid | NO | gen_random_uuid() | PK | uuid | Public |
| name | text | NO | — | Category name (unique) | "Pothole" | Public |
| description | text | YES | — | Description | "Potholes on roads" | Public |
| icon | text | YES | — | Material icon name | "report_problem" | Public |
| active | boolean | NO | true | Active flag | true | Public |
| created_at | timestamptz | NO | now() | | ts | Public |

## complaints

| Field | Type | Null | Default | Meaning | Validation | Example | Security | Module |
|-------|------|------|---------|---------|------------|---------|----------|--------|
| id | uuid | NO | gen_random_uuid() | PK | — | uuid | Owner/Admin | All |
| complaint_number | text | NO | generate_complaint_number() | Human-readable ID (unique) | JM-YYYY-NNNNNN | "JM-2026-000123" | Owner/Admin | All |
| user_id | uuid | NO | — | FK→profiles | — | uuid | Owner | Complaints |
| category_id | uuid | NO | — | FK→categories | — | uuid | Owner/Admin | Complaints |
| title | text | NO | — | Title | char_length 3..200 | "Pothole near market" | Owner/Admin | Complaints |
| description | text | YES | — | Description | — | "Large pothole..." | Owner/Admin | Complaints |
| severity | complaint_severity | NO | MEDIUM | Severity | enum | HIGH | Owner/Admin | Complaints/SLA |
| status | complaint_status | NO | SUBMITTED | Status | enum | ASSIGNED | Owner/Admin | Complaints |
| location | geography(point,4326) | YES | — | PostGIS point | Bhopal geofence (app) | geojson | Owner/Admin (nearby: privacy-safe) | Map |
| address | text | YES | — | Address | — | "MP Nagar, Bhopal" | Owner/Admin (nearby: truncated) | Map |
| created_at | timestamptz | NO | now() | | | ts | Owner/Admin | All |
| updated_at | timestamptz | NO | now() | trigger | | ts | Owner/Admin | All |
| resolved_at | timestamptz | YES | — | Set on RESOLVED | trigger | ts | Owner/Admin | Complaints |
| sla_deadline | timestamptz | YES | — | SLA deadline | [S] population | ts | Admin | SLA |
| idempotency_key | text | YES | — | Dedup key | unique per user | "jm_abc_123" | Owner | Complaints |
| verification_status | text | YES | — | Community verification sub-state | check in (pending,confirmed,reopened,needs_review) | pending | Owner/Admin | Verification |
| assigned_department_id [S] | uuid | YES | — | FK→departments | | uuid | Admin | Assignment |
| ward [S] | text | YES | — | Ward | | "Ward 5" | Admin | Analytics |
| evidence_request_message [S] | text | YES | — | Message when evidence requested | | text | Owner | Evidence |

## complaint_images

| Field | Type | Null | Default | Meaning | Security |
|-------|------|------|---------|---------|----------|
| id | uuid | NO | gen_random_uuid() | PK | Owner |
| complaint_id | uuid | NO | — | FK→complaints CASCADE | Owner (via is_own_complaint) |
| storage_path | text | NO | — | Bucket path | Owner/Admin |
| image_url | text | NO | — | Signed URL | Owner/Admin |
| created_at | timestamptz | NO | now() | | Owner |

## complaint_status_history

| Field | Type | Null | Default | Meaning | Security |
|-------|------|------|---------|---------|----------|
| id | uuid | NO | gen_random_uuid() | PK | Owner |
| complaint_id | uuid | NO | — | FK CASCADE | Owner |
| status | complaint_status | NO | — | New status | Owner |
| comment | text | YES | — | Note/reason | Owner |
| updated_by | uuid | YES | — | FK→auth.users SET NULL | Owner/Admin |
| created_at | timestamptz | NO | now() | | Owner |

## rewards

| Field | Type | Null | Default | Meaning | Security |
|-------|------|------|---------|---------|----------|
| id | uuid | NO | gen_random_uuid() | PK | Owner |
| user_id | uuid | NO | — | FK→profiles CASCADE | Owner |
| complaint_id | uuid | YES | — | FK→complaints SET NULL | Owner |
| activity_type | text | NO | — | e.g. VALID_ISSUE_REPORT | Owner |
| points | integer | NO | 0 | Signed points | Owner |
| description | text | YES | — | | Owner |
| created_at | timestamptz | NO | now() | | Owner |

## reward_rules

| Field | Type | Null | Default | Meaning | Security |
|-------|------|------|---------|---------|----------|
| activity_type | text | NO | — | PK | Authenticated |
| title | text | NO | — | Display title | Authenticated |
| points | integer | NO | — | Point value | Authenticated |
| description | text | YES | — | | Authenticated |
| active | boolean | NO | true | | Authenticated |
| created_at | timestamptz | NO | now() | | Authenticated |
| updated_at | timestamptz | NO | now() | | Authenticated |

## level_config

| Field | Type | Null | Default | Meaning | Security |
|-------|------|------|---------|---------|----------|
| level | integer | NO | — | PK, check >=1 | Authenticated |
| title | text | NO | — | e.g. "Civic Champion" | Authenticated |
| min_points | integer | NO | — | check >=0 | Authenticated |
| created_at | timestamptz | NO | now() | | Authenticated |

## badges

| Field | Type | Null | Default | Meaning | Security |
|-------|------|------|---------|---------|----------|
| id | uuid | NO | gen_random_uuid() | PK | Public |
| name | text | NO | — | unique | Public |
| description | text | YES | — | | Public |
| icon | text | YES | — | Material icon | Public |
| criteria | text | YES | — | JSON criteria (metric/count) | Public |
| created_at | timestamptz | NO | now() | | Public |

## user_badges

| Field | Type | Null | Default | Meaning | Security |
|-------|------|------|---------|---------|----------|
| id | uuid | NO | gen_random_uuid() | PK | Owner |
| user_id | uuid | NO | — | FK→profiles CASCADE | Owner |
| badge_id | uuid | NO | — | FK→badges CASCADE | Owner |
| earned_at | timestamptz | NO | now() | | Owner |

## notifications

| Field | Type | Null | Default | Meaning | Security |
|-------|------|------|---------|---------|----------|
| id | uuid | NO | gen_random_uuid() | PK | Owner |
| user_id | uuid | NO | — | FK→profiles CASCADE | Owner |
| title | text | NO | — | | Owner |
| message | text | NO | — | | Owner |
| type | text | NO | — | e.g. COMPLAINT_VERIFIED | Owner |
| is_read | boolean | NO | false | | Owner |
| read_at | timestamptz | YES | — | | Owner |
| complaint_id | uuid | YES | — | FK→complaints SET NULL | Owner |
| data | jsonb | YES | — | | Owner |
| push_sent | boolean | NO | false | FCM outbox flag | Service |
| created_at | timestamptz | NO | now() | | Owner |

## device_tokens

| Field | Type | Null | Default | Meaning | Security |
|-------|------|------|---------|---------|----------|
| id | uuid | NO | gen_random_uuid() | PK | Owner |
| user_id | uuid | NO | — | FK→profiles CASCADE | Owner |
| token | text | NO | — | unique FCM token | Owner |
| platform | text | NO | unknown | check android/ios/web/unknown | Owner |
| created_at | timestamptz | NO | now() | | Owner |
| last_used_at | timestamptz | NO | now() | | Owner |

## resolution_evidence

| Field | Type | Null | Default | Meaning | Security |
|-------|------|------|---------|---------|----------|
| id | uuid | NO | gen_random_uuid() | PK | Authenticated |
| complaint_id | uuid | NO | — | FK CASCADE | Authenticated |
| storage_path | text | NO | — | | Authenticated |
| image_url | text | NO | — | | Authenticated |
| uploaded_by | uuid | YES | — | FK→auth.users SET NULL | Authenticated |
| caption | text | YES | — | | Authenticated |
| created_at | timestamptz | NO | now() | | Authenticated |

## community_verifications

| Field | Type | Null | Default | Meaning | Security |
|-------|------|------|---------|---------|----------|
| id | uuid | NO | gen_random_uuid() | PK | Authenticated |
| complaint_id | uuid | NO | — | FK CASCADE | Authenticated |
| user_id | uuid | NO | — | FK→profiles CASCADE | Authenticated |
| verified | boolean | NO | — | confirm/dispute | Authenticated |
| comment | text | YES | — | | Authenticated |
| created_at | timestamptz | NO | now() | | Authenticated |

## aadhaar_kyc

| Field | Type | Null | Default | Meaning | Validation | Security |
|-------|------|------|---------|---------|------------|----------|
| id | uuid | NO | gen_random_uuid() | PK | — | Owner |
| auth_user_id | uuid | NO | — | unique FK→auth.users CASCADE | | Owner |
| aadhaar_hash | text | NO | — | sha256(digits) | | Owner |
| aadhaar_masked | text | NO | — | XXXX XXXX 1234 | | Owner |
| full_name | text | NO | — | Name | length>=3 | Owner |
| status | text | NO | pending | check pending/verified/rejected | | Owner |
| verified_at | timestamptz | YES | — | | | Owner |
| rejected_reason | text | YES | — | | | Owner |
| created_at | timestamptz | NO | now() | | | Owner |
| updated_at | timestamptz | NO | now() | trigger | | Owner |

---

## Referenced-Only Tables [S]

### complaint_ai_verification [S]
| Field | Type | Meaning | Security |
|-------|------|---------|----------|
| id | uuid | PK | Admin |
| complaint_id | uuid | FK→complaints | Admin |
| status | text | pending/analyzing/completed/error | Admin |
| ai_decision | ai_decision | PASS/REVIEW | Admin |
| category_match | text | HIGH/MEDIUM/LOW/NONE | Admin |
| evidence_quality | text | | Admin |
| detected_category | text | | Admin |
| selected_category | text | | Admin |
| description_match | text | | Admin |
| image_count | int | | Admin |
| reason | text | | Admin |
| reviewed_by | uuid | | Admin |
| reviewed_at | timestamptz | | Admin |
| review_decision | text | VERIFIED/REJECTED/EVIDENCE_REQUIRED | Admin |
| review_reason | text | | Admin |
| review_reason_type | text | structured reason | Admin |
| started_at | timestamptz | (14) | Admin |
| completed_at | timestamptz | (14) | Admin |
| failed_at | timestamptz | (14) | Admin |
| attempt_count | int | default 0 (14) | Admin |
| last_error | text | (14) | Admin |
| created_at | timestamptz | | Admin |

### officers [S]
| Field | Type | Meaning | Security |
|-------|------|---------|----------|
| id | uuid | PK | Admin |
| profile_id | uuid | FK→profiles | Admin |
| department_id | uuid | FK→departments | Admin |
| title | text | | Admin |
| active | boolean | | Admin |
| deleted_at | timestamptz | soft delete | Admin |

### departments [S]
| Field | Type | Meaning | Security |
|-------|------|---------|----------|
| id | uuid | PK | Admin |
| name | text | | Admin |
| code | text | unique | Admin |
| description | text | | Admin |
| categoryMapping | text[] | category codes | Admin |
| isActive | boolean | | Admin |
| created_at | timestamptz | | Admin |
| updated_at | timestamptz | | Admin |

### complaint_assignments [S]
| Field | Type | Meaning | Security |
|-------|------|---------|----------|
| id | uuid | PK | Admin |
| complaint_id | uuid | FK | Admin |
| department_id | uuid | FK | Admin |
| officer_id | uuid | FK→officers/profiles | Admin |
| assigned_by_id | uuid | FK | Admin |
| note | text | | Admin |
| assigned_at | timestamptz | | Admin |

### audit_logs [S]
| Field | Type | Meaning | Security |
|-------|------|---------|----------|
| id | uuid | PK | Admin |
| actor_id | uuid | FK | Admin |
| action | text | e.g. OFFICER_REVIEW | Admin |
| entity_type | text | e.g. complaint | Admin |
| entity_id | uuid | | Admin |
| after | jsonb | new state | Admin |
| created_at | timestamptz | | Admin |

### sla_rules [S]
| Field | Type | Meaning | Security |
|-------|------|---------|----------|
| id | uuid | PK | Admin |
| category_id | uuid | nullable | Admin |
| department_id | uuid | nullable | Admin |
| severity | text | | Admin |
| deadline_hours | int | | Admin |
| warning_hours | int | | Admin |
| critical_hours | int | | Admin |
| active | boolean | | Admin |

### civic_incidents [S]
| Field | Type | Meaning | Security |
|-------|------|---------|----------|
| id | uuid | PK | Admin |
| incident_number | text | | Admin |
| title | text | | Admin |
| report_count | int | | Admin |
| citizen_count | int | | Admin |
| photo_count | int | | Admin |
| ward | text | | Admin |
| status | text | | Admin |
| created_at | timestamptz | | Admin |

### safety_incidents [S]
| Field | Type | Meaning | Security |
|-------|------|---------|----------|
| id | uuid | PK | Owner/Responder |
| type | text | SOS/CHECK_IN/ANONYMOUS_REPORT | Responder |
| status | text | ACTIVE/RESPONDING/RESOLVED/CANCELLED/EXPIRED | Responder |
| user_id | uuid | nullable (anonymous) | Responder |
| location | geography | | Responder |
| address | text | | Responder |
| message | text | | Responder |
| created_at | timestamptz | | Responder |

### category_ai_config [S]
| Field | Type | Meaning | Security |
|-------|------|---------|----------|
| category_id | uuid | FK | Authenticated/Admin |
| requires_images | boolean | | Authenticated |
| min_images | int | | Authenticated |
| max_images | int | | Authenticated |
| requires_different_angles | boolean | | Authenticated |
| ai_enabled | boolean | | Admin |
| auto_pass | boolean | | Admin |
| auto_fail | boolean | | Admin |
| review_threshold | text | LOW/MEDIUM/HIGH | Admin |
| category_hints | text | | Admin |
