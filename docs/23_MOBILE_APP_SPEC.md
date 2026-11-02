# JanMitra — Citizen Mobile App Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Stack:** Flutter 3.x / Dart 3.13+ · Riverpod 3 · go_router 18 · supabase_flutter 2 · flutter_map 8 (Mapbox tiles) · geolocator · geocoding · image_picker · firebase_messaging · flutter_local_notifications.

> All screens are **Implemented** unless noted. Each screen: purpose, UI elements, actions, data, validation, API/DB, navigation, loading/empty/error/offline, accessibility.

---

## 1. Splash
- **Purpose:** Branded gradient splash; route to onboarding/login/home.
- **UI:** Fade+scale animation; 2s.
- **Data:** `authStateProvider` + `shouldShowOnboarding()` (SharedPreferences `janmitra_onboarding_seen`).

## 2. Onboarding
- **Purpose:** 3-page intro; persists seen flag.
- **Navigation:** → Login or Home.

## 3. Login
- **UI:** Identifier (email/phone) + password; show/hide; forgot link; register link.
- **Actions:** `signInWithIdentifier` (email direct; phone → `resolve_phone_login` → email → `signInWithPassword`).
- **Validation:** email/phone format; password min.
- **Errors:** friendly mapping (invalid credentials, phoneRegistered, accountExists, rate limit, expired link).
- **Navigation:** → Home (success) or Register/Forgot.

## 4. Registration
- **UI:** name, email, phone (10-digit, validated), password (strength), confirm.
- **Actions:** `signUp(email, password, data:{name, phone})`; phone uniqueness pre-check via `resolve_phone_login`; auto sign-in if no session returned.
- **Errors:** duplicate email/phone; weak password.
- **Navigation:** → Home.

## 5. Forgot Password
- **UI:** email → `resetPasswordForEmail` → confirmation screen.

## 6. Reset Password (deep link)
- **UI:** new password + confirm → `updateUser(password)`.
- **Trigger:** `passwordRecoveryProvider` listens `AuthChangeEvent.passwordRecovery` → `/reset-password`.

## 7. Aadhaar Registration (optional)
- **UI:** Pre-fill name from profile; Aadhaar field formatted `XXXX XXXX XXXX`; consent checkbox; submit; skip ("verify later").
- **Actions:** `submit_aadhaar_registration` (validates 12 digits + name ≥3 chars; stores sha256 + masked; status verified).
- **Errors:** PGRST202/205 → backendOutOfDate; aadhaar_already_registered; invalid_aadhaar.
- **Navigation:** → Profile/Home.

## 8. Home
- **UI:** HomeHeader, EvidenceRequiredAlert (count>0), QuickActions (Report/My Complaints/Nearby/Rewards/Safety), CivicReputationCard, NearbyPreviewSection (≤3 within 2km), RecentComplaintsSection, VerifyResolutionsCard, CommunitySnapshotSection. RefreshIndicator.
- **Data:** `homeDashboardProvider` (profile, levelTitle, badgeCount, reportsCount, recentComplaints, communityStats, evidenceRequiredCount); `nearby_complaints` RPC; `community_complaint_stats` RPC.
- **Realtime:** `realtimeRefresherProvider` (invalidates on complaint lifecycle events).
- **Offline:** GPS failure → nearby preview hidden.

## 9. Report Issue (5-step wizard)
- **UI:** LinearProgressIndicator + step dots; close resets; Back/Next/Submit.
- **Step 1 Category:** grid from `categoriesWithAiConfigProvider` (joins `category_ai_config`).
- **Step 2 Photos:** camera (quality 70, max 1920×1080) or gallery; 3-col grid; per-photo status (uploading/uploaded/failed/rejected); retry; max 5; min 3; jpg/png/webp ≤10MB.
- **Step 3 Location:** "Use my current location" (geolocator high accuracy) OR tap/drag marker on flutter_map (Mapbox streets-v12); **Bhopal geofence** (lat 23.10–23.40, lng 77.25–77.55); reverse geocode (`geocoding`, non-blocking).
- **Step 4 Details:** title (maxLength 200, min 3), description (maxLines 5), severity ChoiceChips (low/medium/high/critical).
- **Step 5 Review:** summary + disclaimer; `find_similar_complaints` on enter; banner if matches → `SimilarComplaintsSheet` (pick match → "Submit & Join").
- **Submit:** idempotency key `jm_<uid8>_<ts>_<hash>`; upload pending; `create_complaint` or `join_similar_complaint`; fire `ai-evidence-verification` if AI_CHECKING; → `/report-success`.
- **Errors:** <3 photos blocked; outside Bhopal → error + clear; upload failure → retry keeps state+images.
- **Offline:** GPS failure → manual map still usable.

## 10. Report Success
- **UI:** animated check, complaint number, status badge, **actual points from `rewards` table** via `reportRewardProvider` (VALID_ISSUE_REPORT row). Track/Home actions.

## 11. My Complaints
- **UI:** list (limit 100), search (title/number/category/address), filter chips (All/Active/Resolved/Reopened), sort (Recently Updated/Newest/Oldest), Realtime refresh.
- **Data:** `fetchRecentComplaints(limit: 100)`.
- **Empty:** per filter.

## 12. Complaint Detail
- **UI:** header (number, title, category, StatusBadge), assignment section (dept+officer+ward+routing method+assigned date), AI status banner (AI_CHECKING/AI_VERIFIED/AI_REVIEW_REQUIRED/AI_FAILED/EVIDENCE_REQUIRED — shows officer message + "Upload New Photos"), incident card (citizen count), evidence gallery (round 1 original vs rounds 2+ additional), description, location, timeline (6 steps), resolution evidence. Delete action (pre-verification only). Full-screen image viewer.
- **Actions:** add evidence (`add_evidence_to_complaint`) when EVIDENCE_REQUIRED/AI_FAILED; delete (deletable statuses only).
- **Data:** `fetchComplaintDetail` (full joins: complaint_status_history, resolution_evidence, complaint_assignments); signed URLs.
- **Realtime:** `complaintDetailRealtimeProvider`.

## 13. Nearby Issues / Map
- **UI:** flutter_map (Mapbox streets-v12); radius selector (500m/1km/2km/5km/10km); filter dialog (categories + statuses); display mode (markers/heatmap/both); refresh; marker clustering (grid-based, threshold by zoom); user location marker; complaint markers colored by status with severity dot; heatmap layer (CircleLayer gradient); bottom detail sheet on tap; "Search this area" on pan; floating zoom/locate buttons.
- **Data:** `nearby_complaints` RPC, `nearby_complaints_heatmap` RPC.
- **Realtime:** `nearbyRealtimeProvider` (complaints + complaint_images ALL → 500ms debounce refetch).

## 14. Community Verification
- **UI:** list of nearby resolved+pending complaints (before/after photos, confirmed/disputed counts, "responded" chip); bottom sheet detail (before/after images, comment field, **mandatory verification photos** (pickMultiImage → upload → `submit_community_verification`), Confirm/Dispute).
- **Data:** `verifiable_complaints` RPC, `submit_community_verification` RPC, `complaint_images` bucket.

## 15. Notifications
- **UI:** list (`NotificationTile`), "Mark all read", tap → mark read + navigate (complaint detail if complaintId, rewards for reward/badge, else home). Realtime refresh. Nav badge (unread count).
- **Data:** `notifications` (SELECT/UPDATE optimistic), `device_tokens`.
- **Realtime:** `notificationsChangesProvider` (channel `notifications:user:$profileId`).

## 16. Profile
- **UI:** header (avatar, name, level, points), info section (Aadhaar masked + verify), stats, menu (My Activity: Safety/My Complaints/Rewards/Leaderboard/Badges/Contribution/Notifications; App: Settings/Preferences/Privacy/Help/Privacy Policy/Terms; Account: Logout).
- **Data:** `profileDashboardProvider` (profile, summary, counts, badgeCount, aadhaar KYC).

## 17. Edit Profile
- **UI:** avatar (camera/gallery → `avatars` bucket, orphan cleanup on failure), name (2–80), phone (10–15 digits, normalized), city, ward. **Whitelist update only** (points/level/email locked).

## 18. Preferences
- **UI:** 5 toggles (notify_push/email/in_app, privacy_show_leaderboard/ward) → `updatePreferences`, persisted immediately.

## 19. Privacy Settings
- **UI:** 8 sections: Profile Visibility (4 levels + toggles), Location Sharing (precision exact/block/ward/city + toggles + clear history), Aadhaar (masked, shareWithOfficials), Notifications, Language (en/hi), App Permissions (info-only tiles), Data & Account (download-my-data, logout all devices, delete account 30-day grace + cancel), Accessibility.
- **Data:** `upsert_user_settings`, `upsert_notification_preference`, `request_account_deletion`, `cancel_account_deletion`, `clear_location_history`, `download-my-data` edge function, `signOut(scope: others)`.

## 20. Settings
- **UI:** language selector (en/hi), account summary (read-only), legal links, about (version).

## 21. Badges
- **UI:** full badge catalog via `rewardsDashboardProvider` (earned vs locked).

## 22. Contribution History
- **UI:** point transactions list (`rewards` joined to complaints).

## 23. Rewards
- **UI:** ReputationSummaryCard (points, level, progress), BadgeGrid, RewardRulesSection, ContributionHistorySection. Pull-to-refresh.
- **Data:** `get_reputation_summary` RPC, `reward_rules`, `badges`, `user_badges`, `rewards`, `level_config`.

## 24. Leaderboard
- **UI:** top-3 podium + full list, `is_me` highlighting.
- **Data:** `community_leaderboard` RPC (limit 50, privacy-safe).

## 25. Women Safety (main)
- **UI:** pulsing red SOS button (long-press → 3-2-1 countdown → `trigger_sos` with GPS); on activation: status card, contacts count, live location sharing every 15s (`share_location`), cancel (`cancel_sos`). Quick actions grid (Contacts/CheckIn/Nearby/Report). Emergency call 112 (`url_launcher`).

## 26. Safety Contacts
- **UI:** trusted contacts (max 3); add/edit dialogs (name, phone +91, relationship).
- **Data:** `fetch_safety_contacts`, `add_safety_contact`, `update_safety_contact`, `delete_safety_contact`.

## 27. Safety Check-in
- **UI:** set timer (15/30/60/120 min) via `create_safety_checkin`; countdown; "I'm safe" → `complete_safety_checkin`; miss → auto-SOS via `trigger_sos`.

## 28. Nearby Safe Places
- **UI:** list (POLICE/HOSPITAL/SAFE_PLACE) via `find_nearby_safety_places`; call button (tel:); open Google Maps directions.

## 29. Anonymous Report
- **UI:** message textarea + optional location toggle → `submit_anonymous_report`.

## 30. Static Content
- Help & Support / Privacy Policy / Terms (i18n-keyed).

---

## Cross-cutting

### Navigation
go_router with `StatefulShellRoute.indexedStack` (4-tab bottom shell: Home, Complaints, Notifications, Profile + center Report FAB). Auth-gated redirects.

### State Management
Riverpod (`FutureProvider`, `StreamProvider`, `NotifierProvider`, `AsyncNotifierProvider`). `ProviderScope` at root. Repositories injected via `repository_providers.dart`.

### Error Handling
Every repository returns `Result<T>` (`Success`/`FailureResult`). Providers throw → `.when(error:)`. Auth errors → i18n keys. Network errors → `error.network.connection`.

### Accessibility
Font scale, high contrast, reduce motion, screen reader hints, larger touch targets (persisted locally + server via `upsert_user_settings`).

### i18n
English + Hindi (`AppLocalizations`, `context.tr(key, args)`).

### Offline Behavior
App degrades gracefully (placeholder mode when Supabase credentials missing; GPS failure doesn't block reporting — manual map; realtime disconnects logged). Not offline-first (no sync queue).

### Theme
Material 3 light + dark (`AppTheme.light`/`dark` from `AppColors.brandSeed`).
