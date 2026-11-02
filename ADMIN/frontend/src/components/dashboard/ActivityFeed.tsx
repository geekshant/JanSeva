import {
  FilePlus,
  ArrowRightCircle,
  UserCheck,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { ActivityEntry } from '@/services/dashboard';

const activityMeta: Record<string, { icon: LucideIcon; color: string; key: string }> = {
  SUBMITTED: { icon: FilePlus, color: 'text-blue-500', key: 'dashboard.actSubmitted' },
  VERIFIED: { icon: ShieldCheck, color: 'text-green-500', key: 'dashboard.actVerified' },
  ASSIGNED: { icon: UserCheck, color: 'text-purple-500', key: 'dashboard.actAssigned' },
  IN_PROGRESS: { icon: TrendingUp, color: 'text-amber-500', key: 'dashboard.actInProgress' },
  RESOLVED: { icon: CheckCircle2, color: 'text-green-600', key: 'dashboard.actResolved' },
  REJECTED: { icon: ArrowRightCircle, color: 'text-red-500', key: 'dashboard.actRejected' },
};

function timeAgo(iso: string, t: (k: string, o?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('time.justNow');
  if (mins < 60) return t('time.minAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('time.hrAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('time.dayAgo', { count: days });
}

export function ActivityFeed({
  activities,
  loading,
}: {
  activities?: ActivityEntry[];
  loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('dashboard.liveActivity')}</CardTitle>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : !activities || activities.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t('dashboard.noActivity')}
          </p>
        ) : (
          <div className="relative space-y-4">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
            {activities.map((activity) => {
              const meta = activityMeta[activity.status] ?? {
                icon: ArrowRightCircle,
                color: 'text-muted-foreground',
                key: '',
              };
              const Icon = meta.icon;
              return (
                <div key={activity.id} className="relative flex items-start gap-3">
                  <div className="z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-card">
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </div>
                  <div className="flex-1 space-y-0.5 pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {meta.key ? t(meta.key) : activity.status}
                      </span>
                      <StatusBadge status={activity.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activity.complaint_number && (
                        <span className="font-mono">{activity.complaint_number}</span>
                      )}
                      {activity.complaint_title && ` · ${activity.complaint_title}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {timeAgo(activity.created_at, t)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
