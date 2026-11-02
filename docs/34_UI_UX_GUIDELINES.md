# JanMitra — UI/UX Design System

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Sources:** `mobile/lib/core/theme/` (mobile) + `ADMIN/frontend/src/` + `tailwind.config.js` (admin).

---

## 1. Design Principles
- **Citizen-first:** minimal friction (report in <1 min).
- **Evidence-first:** photo + location are primary inputs.
- **Transparent:** status always visible (badges, timelines).
- **Accessible:** adjustable font scale, high contrast, touch targets.
- **Consistent:** shared color tokens, status colors, component patterns.
- **Responsive:** mobile-first; admin responsive (mobile drawer + desktop sidebar).

## 2. Typography
- **Mobile:** Google Fonts (`google_fonts` ^8). Material 3 typography scale (`AppTypography`).
- **Admin:** Inter font (preload in `index.html`). Tailwind default + custom.

## 3. Color System
### Mobile (`app_colors.dart`)
- Brand gradient from `AppColors.brandSeed` (Material 3 seed).
- Status colors: `submitted`, `verified`, `inProgress`, `resolved`, `rejected`, `warning`, `duplicate`, `info`.
- Severity colors (low/medium/high/critical) on ChoiceChips.

### Admin (`tailwind.config.js` + CSS variables)
- `darkMode: 'class'` (theme toggle).
- Sidebar + brand color tokens.
- StatusBadge / SeverityBadge / SlaBadge / AiAlertBadge / AiDecisionBadge color-coded.
- shadcn/ui CSS variables (slate baseColor).

## 4. Components

### Mobile (`core/widgets/`)
| Component | Purpose |
|-----------|---------|
| `AppButton` / `PrimaryButton` / `SecondaryButton` | Buttons |
| `AppCard` | Card container |
| `AppTextField` | Input field |
| `PasswordField` / `PasswordRequirements` | Password input + hints |
| `CategoryIcon` (`CategoryIconHelper.iconFor/colorFor`) | Category icons |
| `StatusBadge` | Complaint status badge |
| `ConfirmDialog` | Confirmation modal |
| `EmptyView` / `ErrorView` / `LoadingView` / `PlaceholderView` | States |
| `OfflineBanner` | Offline indicator |
| `SectionHeader` | Section titles |

### Admin (shadcn/ui + custom)
| Component | Purpose |
|-----------|---------|
| `StatusBadge` / `SeverityBadge` / `SlaBadge` | Badges |
| `IncidentStatusBadge` / `AiAlertBadge` / `AiDecisionBadge` | Specialized badges |
| `EmptyState` / `ErrorState` / `LoadingState` / `ErrorBoundary` | States |
| `Pagination` / `ConfirmDialog` | Navigation/confirm |
| `ComplaintsTable` + `BulkActionBar` | Data table |
| `ComplaintFiltersBar` / `MapFiltersBar` / `DashboardFiltersBar` | Filters |
| `ChangeStatusDialog` / `AddNoteDialog` / `EscalateDialog` / `AssignmentDialog` / `AiVerificationPanel` / `ReopenComplaintDialog` / `SuspendDialog` | Action dialogs |
| `EvidenceGallery` / `GoogleMapsLocation` / `CitizenInfoCard` / `WorkflowTimeline` / `ResolutionEvidencePanel` / `CommunityVerificationPanel` | Complaint detail panels |
| `CivicMap` / `ComplaintPreviewPanel` / `MapLegend` / `MapListPanel` / `MapStats` | Map components |
| `StatCard` / `KpiGrid` / `TrendChart` / `CategoryDistribution` / `ActivityFeed` / `AiCivicInsights` | Dashboard components |
| shadcn primitives: avatar, badge, button, card, checkbox, dialog, dropdown-menu, input, label, radio-group, select, separator, skeleton, spinner, switch, table, textarea, tooltip | UI kit |

## 5. Cards / Buttons / Forms
- Cards: `AppCard` (mobile) / shadcn `Card` (admin) with padding tokens (`AppSpacing.pagePadding`, `cardPadding`).
- Buttons: `AppButton` variants; shadcn `Button` (default/destructive/outline/secondary/ghost).
- Forms: `AppTextField` + validation; shadcn `Input` + `Label` + Zod validation (backend).

## 6. Status Indicators
- `StatusBadge` color-coded per complaint_status (20 values).
- `SeverityBadge` (low/medium/high/critical).
- `SlaBadge` (ON_TRACK/DUE_SOON/AT_RISK/BREACHED/ESCALATED/RESOLVED).
- `AiDecisionBadge` (PASS/REVIEW/FAIL) + `AiAlertBadge` (derived).

## 7. Loading / Empty / Error States
- Loading: `LoadingView` (mobile) / `LoadingState` + skeletons (admin).
- Empty: `EmptyView` (mobile) / `EmptyState` with icon+title+description+action (admin).
- Error: `ErrorView` (mobile) / `ErrorState` with retry (admin) + top-level `ErrorBoundary`.
- Partial: admin Analytics uses `InlineError` per section (doesn't blank whole page).

## 8. Responsive Design
- Mobile: Flutter responsive layouts; bottom nav shell.
- Admin: desktop sidebar + mobile drawer (`AppShell`); responsive grids; mobile filter drawers on map.

## 9. Mobile Design
- Material 3 light + dark (`AppTheme.light`/`dark`).
- 4-tab bottom shell (Home, Complaints, Notifications, Profile) + center Report FAB.
- Custom nav bar with notch for FAB.
- Spacing tokens (`AppSpacing`), radius tokens (`AppRadius`), shadows (`AppShadows`), button styles (`AppButtonStyles`), input styles (`AppInputStyles`).

## 10. Admin Dashboard Design
- Sidebar (collapsible) + TopNav (breadcrumbs, search, realtime indicator, buzzer, theme, notifications, profile).
- `PageContainer` wrapper (title, description, actions).
- Dark/light theme toggle (anti-FOUC inline script reads `localStorage['janmitra-theme']`).
- `nav-config.ts` single source of truth for sidebar sections + breadcrumb labels.

## 11. Dark/Light Theme
- Mobile: Material 3 light + dark from brand seed.
- Admin: `darkMode: 'class'` + ThemeProvider + `localStorage['janmitra-theme']`.
