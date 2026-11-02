import {
  LayoutDashboard,
  FileText,
  Map,
  Clock,
  Building2,
  UserCheck,
  Trophy,
  BarChart3,
  Bell,
  Settings,
  AlertOctagon,
  RotateCcw,
  Workflow,
  ScanSearch,
  BrainCircuit,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Navigation config — single source of truth for sidebar + breadcrumbs.
// Sections with multiple items render as collapsible groups; single-item
// sections render flat.
// ---------------------------------------------------------------------------

/**
 * `countKey` opts a nav item into a live sidebar badge. The Sidebar reads
 * the counts from `useNavCounts()` and renders the matching badge next to
 * the label. Only items that need a dynamic count set this — everything
 * else renders without a badge.
 */
export type NavCountKey = 'aiReview' | 'reopened' | 'safety';

export interface NavItem {
  /** Translation key (resolved via react-i18next `t(label)`). */
  label: string;
  to: string;
  icon: LucideIcon;
  /** If set, the sidebar renders a live count badge for this item. */
  countKey?: NavCountKey;
}

export interface NavSection {
  /** Translation key for the section heading. */
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    label: 'nav.dashboard',
    icon: LayoutDashboard,
    items: [{ label: 'nav.dashboard', to: '/', icon: LayoutDashboard }],
  },
  {
    label: 'nav.operations',
    icon: FileText,
    items: [
      { label: 'nav.complaints', to: '/complaints', icon: FileText },
      { label: 'nav.aiReviewQueue', to: '/complaints/ai-review', icon: ScanSearch, countKey: 'aiReview' },
      { label: 'nav.reopenedCases', to: '/complaints/reopened', icon: RotateCcw, countKey: 'reopened' },
      { label: 'nav.civicMap', to: '/map', icon: Map },
      { label: 'nav.incidents', to: '/incidents', icon: AlertOctagon },
      { label: 'nav.slaManagement', to: '/sla', icon: Clock },
    ],
  },
  {
    label: 'nav.organization',
    icon: Building2,
    items: [
      { label: 'nav.departments', to: '/departments', icon: Building2 },
      { label: 'nav.citizens', to: '/citizens', icon: UserCheck },
    ],
  },
  {
    label: 'nav.womenSafety',
    icon: ShieldAlert,
    items: [
      { label: 'nav.safetyAlerts', to: '/safety', icon: ShieldAlert, countKey: 'safety' },
    ],
  },
  {
    label: 'nav.engagement',
    icon: Trophy,
    items: [
      { label: 'nav.gamification', to: '/gamification', icon: Trophy },
      { label: 'nav.civicMissions', to: '/civic-missions', icon: Trophy },
    ],
  },
  {
    label: 'nav.analytics',
    icon: BarChart3,
    items: [
      { label: 'nav.analytics', to: '/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'nav.automation',
    icon: Workflow,
    items: [
      { label: 'nav.automationCenter', to: '/automation', icon: Workflow },
      { label: 'nav.automationRules', to: '/automation/rules', icon: Workflow },
    ],
  },
  {
    label: 'nav.system',
    icon: Settings,
    items: [
      { label: 'nav.notifications', to: '/notifications', icon: Bell },
      { label: 'nav.settings', to: '/settings', icon: Settings },
      { label: 'nav.aiVerificationSettings', to: '/settings/ai-verification', icon: BrainCircuit },
    ],
  },
];

/** Flat lookup for breadcrumbs — path → translation key. */
export const routeLabels: Record<string, string> = {
  // From nav items
  ...navSections
    .flatMap((s) => s.items)
    .reduce<Record<string, string>>((acc, item) => {
      acc[item.to] = item.label;
      return acc;
    }, {}),
  // Sub-routes (accessible from within pages, not in sidebar)
  '/complaints/reopened': 'nav.reopenedCases',
  '/officers': 'nav.officers',
  '/gamification/badges': 'nav.badges',
  '/gamification/rewards': 'nav.rewardRules',
  '/gamification/leaderboard': 'nav.leaderboard',
  '/analytics/complaints': 'nav.complaintAnalytics',
  '/analytics/resolution': 'nav.resolutionAnalytics',
  '/analytics/departments': 'nav.departmentAnalytics',
  '/analytics/wards': 'nav.wardAnalytics',
  '/analytics/civic-health': 'nav.civicHealth',
  '/sla/rules': 'nav.slaRules',
  '/sla/breached': 'nav.slaBreached',
  '/sla/escalations': 'nav.slaEscalations',
  '/automation/rules': 'nav.automationRules',
  '/settings/categories': 'nav.categories',
  '/settings/notifications': 'nav.notificationConfig',
  '/settings/roles': 'nav.rolesPermissions',
  '/complaints/ai-review': 'nav.aiReviewQueue',
  '/settings/ai-verification': 'nav.aiVerificationSettings',
};

/** All flat nav items for search/quick-nav. */
export const allNavItems: NavItem[] = navSections.flatMap((s) => s.items);
