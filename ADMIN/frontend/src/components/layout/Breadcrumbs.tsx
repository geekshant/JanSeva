import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import { ChevronRight, Home } from 'lucide-react';
import { routeLabels } from './nav-config';

// ---------------------------------------------------------------------------
// Extra keys for nested routes that aren't in the sidebar config.
// ---------------------------------------------------------------------------
const extraLabels: Record<string, string> = {
  '/analytics/complaints': 'nav.complaints',
  '/analytics/resolution': 'nav.resolutionAnalytics',
  '/analytics/departments': 'nav.departments',
  '/analytics/wards': 'nav.wardAnalytics',
  '/analytics/civic-health': 'nav.civicHealth',
  '/civic-missions': 'nav.civicMissions',
  '/notifications': 'nav.notifications',
};

const labelKeys: Record<string, string> = { ...routeLabels, ...extraLabels };

export function Breadcrumbs() {
  const location = useLocation();
  const { t } = useTranslation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return (
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Home className="h-4 w-4" />
        <span className="font-medium text-foreground">{t('breadcrumbs.home')}</span>
      </nav>
    );
  }

  const crumbs = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const key = labelKeys[path];
    const label = key ? t(key) : seg.charAt(0).toUpperCase() + seg.slice(1);
    const isLast = i === segments.length - 1;
    return { path, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link
        to="/"
        className="hover:text-foreground transition-colors"
        aria-label={t('breadcrumbs.home')}
      >
        <Home className="h-4 w-4" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.path} className="flex items-center gap-1.5">
          <ChevronRight className="h-4 w-4" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
