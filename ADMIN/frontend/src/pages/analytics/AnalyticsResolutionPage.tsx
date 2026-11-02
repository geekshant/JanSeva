import {
  Clock,
  CheckCircle2,
  TrendingUp,
  Activity,
  RotateCcw,
  AlertTriangle,
  Gauge,
} from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/common/ErrorState';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { useAnalyticsSummary, useTrends } from '@/hooks/useAnalytics';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';

export function AnalyticsResolutionPage() {
  const { t } = useTranslation();
  const summaryQuery = useAnalyticsSummary();
  const trendsQuery = useTrends(30);

  if (summaryQuery.error) {
    return (
      <PageContainer title={t('analytics.resolutionTitle')}>
        <ErrorState title={t('analytics.couldNotLoadData')} onRetry={() => void summaryQuery.refetch()} />
      </PageContainer>
    );
  }

  const summary = summaryQuery.data;

  return (
    <PageContainer
      title={t('analytics.resolutionTitle')}
      description={t('analytics.resolutionDesc')}
    >
      <div className="space-y-6">
        {/* KPI cards — 8 metrics */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={CheckCircle2} label={t('analytics.kpiResolved')} value={summary?.resolved} loading={summaryQuery.isLoading} color="text-green-600" />
          <StatCard icon={TrendingUp} label={t('analytics.kpiResolutionRate')} value={summary ? `${summary.resolution_rate}%` : undefined} loading={summaryQuery.isLoading} color="text-green-600" />
          <StatCard icon={Clock} label={t('analytics.kpiAvgResolution')} value={summary?.avg_resolution_hours !== null && summary?.avg_resolution_hours !== undefined ? `${summary.avg_resolution_hours}h` : '—'} loading={summaryQuery.isLoading} />
          <StatCard icon={Clock} label={t('analytics.kpiMedianResolution')} value={summary?.median_resolution_hours !== null && summary?.median_resolution_hours !== undefined ? `${summary.median_resolution_hours}h` : '—'} loading={summaryQuery.isLoading} />
          <StatCard icon={Gauge} label={t('analytics.kpiSlaCompliance')} value={summary ? `${summary.sla_compliance_rate}%` : undefined} loading={summaryQuery.isLoading} color="text-blue-600" />
          <StatCard icon={Activity} label={t('analytics.kpiOpen')} value={summary?.open} loading={summaryQuery.isLoading} />
          <StatCard icon={RotateCcw} label={t('analytics.kpiReopened')} value={summary ? `${summary.reopened_count} (${summary.reopened_rate}%)` : undefined} loading={summaryQuery.isLoading} color="text-orange-600" />
          <StatCard icon={AlertTriangle} label={t('analytics.kpiEscalated')} value={summary ? `${summary.escalation_count} (${summary.escalation_rate}%)` : undefined} loading={summaryQuery.isLoading} color="text-red-600" />
        </div>

        {/* Submitted vs Resolved trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('analytics.submittedVsResolved')}</CardTitle>
          </CardHeader>
          <CardContent>
            {trendsQuery.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : trendsQuery.data && trendsQuery.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendsQuery.data}>
                  <defs>
                    <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="submittedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="submitted" stroke="#3b82f6" fill="url(#submittedGrad)" strokeWidth={2} name={t('dashboard.legendSubmitted')} />
                  <Area type="monotone" dataKey="resolved" stroke="#22c55e" fill="url(#resolvedGrad)" strokeWidth={2} name={t('dashboard.legendResolved')} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('analytics.noData')}</p>
            )}
          </CardContent>
        </Card>

        {/* SLA summary */}
        {summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                {t('analytics.slaPerformance')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
                <SlaStat label={t('analytics.slaOnTrack')} value={summary.sla.on_track} color="text-green-600" />
                <SlaStat label={t('analytics.slaDueSoon')} value={summary.sla.due_soon} color="text-amber-600" />
                <SlaStat label={t('analytics.slaAtRisk')} value={summary.sla.at_risk} color="text-orange-600" />
                <SlaStat label={t('analytics.slaBreached')} value={summary.sla.breached} color="text-red-600" />
                <SlaStat label={t('analytics.slaEscalated')} value={summary.sla.escalated} color="text-red-700" />
                <SlaStat label={t('analytics.slaResolved')} value={summary.sla.resolved} color="text-green-700" />
              </div>
              <div className="mt-4 flex items-center justify-between rounded-md border p-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Gauge className="h-4 w-4 text-blue-600" />
                  {t('analytics.slaComplianceRate')}
                </span>
                <Badge variant={summary.sla_compliance_rate >= 70 ? 'success' : summary.sla_compliance_rate >= 40 ? 'warning' : 'destructive'}>
                  {summary.sla_compliance_rate}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full trend chart */}
        <TrendChart data={trendsQuery.data} loading={trendsQuery.isLoading} />
      </div>
    </PageContainer>
  );
}

function StatCard({ icon: Icon, label, value, loading, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number | undefined; loading: boolean; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <Icon className={`h-4 w-4 ${color ?? 'text-muted-foreground'}`} />
        </div>
        {loading ? <Skeleton className="mt-2 h-7 w-16" /> : <p className={`mt-1 text-2xl font-bold ${color ?? ''}`}>{value ?? '—'}</p>}
      </CardContent>
    </Card>
  );
}

function SlaStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
