import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import { ShieldCheck, ChevronDown, PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navSections, type NavSection, type NavCountKey } from './nav-config';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNavCounts } from '@/hooks/useVerification';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  // One subscription for the whole sidebar — both counts refresh together.
  const counts = useNavCounts();
  return (
    <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand header */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-sidebar-border',
          collapsed ? 'justify-center px-2' : 'gap-2 px-6',
        )}
      >
        <ShieldCheck className="h-7 w-7 shrink-0 text-primary" />
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
            {t('common.appName')}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {navSections.map((section) => (
          <NavGroup
            key={section.label}
            section={section}
            collapsed={collapsed}
            onNavigate={onNavigate}
            counts={counts}
          />
        ))}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden shrink-0 border-t border-sidebar-border p-2 lg:block">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="w-full justify-start gap-3 px-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span>{t('nav.collapse')}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NavGroup — collapsible section with nested items.
// ---------------------------------------------------------------------------

function NavGroup({
  section,
  collapsed,
  onNavigate,
  counts,
}: {
  section: NavSection;
  collapsed: boolean;
  onNavigate?: () => void;
  counts: ReturnType<typeof useNavCounts>;
}) {
  const location = useLocation();
  const { t } = useTranslation();

  // Auto-expand if any child is the current route
  const hasActiveChild = section.items.some(
    (item) =>
      item.to === '/'
        ? location.pathname === '/'
        : location.pathname === item.to || location.pathname.startsWith(item.to + '/'),
  );

  const [open, setOpen] = useState(hasActiveChild);

  // Single-item section: render flat (no chevron)
  if (section.items.length === 1) {
    const item = section.items[0]!;
    return (
      <NavItemLink
        item={item}
        collapsed={collapsed}
        onNavigate={onNavigate}
        counts={counts}
      />
    );
  }

  // Collapsed mode: icon-only with tooltip
  if (collapsed) {
    // When collapsed, show a count dot on the section icon if ANY item has a count.
    const sectionCount = section.items.reduce(
      (sum, item) => sum + (item.countKey ? counts[`${item.countKey}Count` as keyof typeof counts] as number : 0),
      0,
    );
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <button
              onClick={() => setOpen((p) => !p)}
              className={cn(
                'flex w-full items-center justify-center rounded-md px-3 py-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                hasActiveChild && 'bg-sidebar-accent/50 text-sidebar-accent-foreground',
              )}
            >
              <section.icon className="h-4 w-4 shrink-0" />
            </button>
            {sectionCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {sectionCount > 99 ? '99+' : sectionCount}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {t(section.label)}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Expanded mode: section label + collapsible items
  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-sidebar-foreground"
      >
        <section.icon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">{t(section.label)}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5">
          {section.items.map((item) => (
            <li key={item.to}>
              <NavItemLink
                item={item}
                collapsed={false}
                onNavigate={onNavigate}
                counts={counts}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NavItemLink — single nav item with active state + optional count badge.
// ---------------------------------------------------------------------------

function NavItemLink({
  item,
  collapsed,
  onNavigate,
  counts,
}: {
  item: { label: string; to: string; icon: React.ComponentType<{ className?: string }>; countKey?: NavCountKey };
  collapsed: boolean;
  onNavigate?: () => void;
  counts: ReturnType<typeof useNavCounts>;
}) {
  const { t } = useTranslation();

  // Resolve the live count for this item, if it has a countKey.
  const count =
    item.countKey === 'aiReview'
      ? counts.aiReviewCount
      : item.countKey === 'reopened'
        ? counts.reopenedCount
        : item.countKey === 'safety'
          ? counts.safetyCount
          : 0;
  const showBadge = item.countKey !== undefined && count > 0;

  const content = (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-2' : 'px-3',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{t(item.label)}</span>
          {showBadge && (
            <Badge
              variant={item.countKey === 'aiReview' ? 'default' : 'secondary'}
              className={
                item.countKey === 'safety'
                  ? 'ml-auto h-5 min-w-5 justify-center px-1.5 text-xs font-semibold bg-red-500 text-white hover:bg-red-600'
                  : 'ml-auto h-5 min-w-5 justify-center px-1.5 text-xs font-semibold'
              }
            >
              {count > 99 ? '99+' : count}
            </Badge>
          )}
        </>
      )}
    </NavLink>
  );  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            {content}
            {showBadge && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {t(item.label)}
          {showBadge && ` (${count})`}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
