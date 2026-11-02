# JanMitra — Accessibility Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Implementation status:** Mobile accessibility settings Implemented (`accessibility_controller.dart` + `upsert_user_settings` RPC). Admin uses shadcn/ui (Radix primitives) which are WAI-ARIA compliant by default.

---

## 1. Text Readability
- Adjustable font scale (mobile `accessibilityProvider.fontScale`; persisted locally + server). Admin: relies on browser zoom + Tailwind responsive type.
- Minimum body text size per Material guidelines (mobile).

## 2. Contrast
- High contrast toggle (mobile `highContrast` → theme adjustment). Admin: theme toggle + WCAG-compliant shadcn palette (slate baseColor).

## 3. Touch Targets
- Larger touch targets toggle (mobile `largerTouchTargets` → increases tap area ≥48dp). Admin: standard mouse/touch targets via shadcn.

## 4. Screen Readers
- Screen reader hints toggle (mobile `screenReaderHints` → adds semantic labels). Flutter `Semantics` widgets on key controls. Admin: shadcn/Radix primitives provide ARIA labels/roles by default.

## 5. Keyboard Navigation
- Admin: shadcn/Radix components keyboard-navigable (focus traps in dialogs, roving tabindex in dropdowns/menus). Mobile: N/A (touch).

## 6. Semantic Labels
- Mobile: `Semantics` labels on icons, buttons, images. Admin: ARIA labels via Radix; `aria-label` on icon-only buttons.

## 7. Error Messages
- Mobile: friendly i18n error keys + inline hints (password requirements, validation). Admin: inline form errors (Zod), toast (sonner), ErrorState with retry.

## 8. Forms
- Mobile: labeled fields, validation hints, password strength. Admin: shadcn `Label` + `Input` + Zod validation + `aria-describedby` for errors.

## 9. Maps
- Mobile: flutter_map markers with semantic labels (category + status). Admin: Mapbox GL — keyboard pan/zoom limited; provide list panel alternative (`MapListPanel`) for screen-reader users.

## 10. Notifications
- Mobile: notification tiles with type icons + unread indicator. Admin: notifications list with proper roles. Push notifications: title + body (FCM).

## 11. Emergency/Safety Flows
- SOS: long-press + 3-2-1 countdown (prevents accidental triggers, accessible via large pulsing button). High priority FCM (`android.priority: high`). Buzzer audio alert (admin) for safety alerts (audio cue for responders).

## 12. Settings Persistence
- Mobile: accessibility settings persisted to SharedPreferences (`loadSavedAccessibility` at boot) + server (`upsert_user_settings` RPC) so they survive reinstall/login.

## 13. Gaps
- Admin has no automated accessibility tests.
- Map keyboard navigation limited (provide list alternatives — admin has `MapListPanel`).
- No voice-over-specific testing documented.
- Color-only status indication (badges use color; should also use icon/text — `StatusBadge` includes text label, mitigating this).
