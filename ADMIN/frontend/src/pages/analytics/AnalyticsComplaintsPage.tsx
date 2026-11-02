import {
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/common/ErrorState';
import { TrendChart } from '@/components/dashboard/TrendChart';
import {
  useTrends,
  useByCategory,
  useByStatus,
  useBySeverity,
} from '@/hooks/useAnalytics';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import type { ComplaintStatus, ComplaintSeverity } from '@/types';

const STATUS_COLORS: Record<ComplaintStatus, string> = {
  SUBMITTED: '#3b82f6',
  AUTO_VALIDATING: '#6366f1',
  NEEDS_REVIEW: '#f97316',
  VERIFIED: '#06b6d4',
  ASSIGNED: '#8b5cf6',
  ACKNOWLEDGED: '#0ea5e9',
  IN_PROGRESS: '#f59e0b',
  RESOLUTION_SUBMITTED: '#14b8a6',
  RESOLUTION_UNDER_REVIEW: '#f97316',
  COMMUNITY_VERIFICATION: '#a855f7',
  RESOLVED: '#22c55e',
  REOPENED: '#ef4444',
  ESCALATED: '#dc2626',
  REJECTED: '#9ca3af',
  CLOSED: '#6b7280',
  AI_CHECKING: '#6366f1',
  AI_VERIFIED: '#22c55e',
  AI_REVIEW_REQUIRED: '#f97316',
  AI_FAILED: '#ef4444',
  EVIDENCE_REQUIRED: '#f59e0b',
};

const SEVERITY_COLORS: Record<ComplaintSeverity, string> = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

export function AnalyticsComplaintsPage() {
  const { t } = useTranslation();
  const trendsQuery = useTrends(30);
  const categoryQuery = useByCategory();
  const statusQuery = useByStatus();
  const severityQuery = useBySeverity();

  if (trendsQuery.error) {
    return (
      <PageContainer title={t('analytics.complaintsTitle')}>
        <ErrorState title={t('analytics.couldNotLoadData')} onRetry={() => void trendsQuery.refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={t('analytics.complaintsTitle')}
      description={t('analytics.complaintsDesc')}
    >
      <div className="space-y-6">
        {/* Trend chart */}
        <TrendChart data={trendsQuery.data} loading={trendsQuery.isLoading} />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChartIcon className="h-4 w-4" />
                {t('analytics.byStatus')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : statusQuery.data && statusQuery.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusQuery.data.map((s) => ({ name: t('status.' + s.status.toLowerCase()), value: s.count }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                    >
                      {statusQuery.data.map((s) => (
                        <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? '#6b7280'} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('analytics.noData')}</p>
              )}
            </CardContent>
          </Card>

          {/* Severity breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                {t('analytics.bySeverity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {severityQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : severityQuery.data && severityQuery.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={severityQuery.data.map((s) => ({ name: t('severity.' + s.severity.toLowerCase()), count: s.count }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <RechartsTooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {severityQuery.data.map((s) => (
                        <Cell key={s.severity} fill={SEVERITY_COLORS[s.severity] ?? '#6b7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('analytics.noData')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              {t('analytics.byCategory')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryQuery.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : categoryQuery.data && categoryQuery.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryQuery.data} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} width={120} />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('analytics.noData')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
