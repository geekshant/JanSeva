import { Users, Activity, CheckCircle2, Heart, Gauge } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/common/ErrorState';
import { useCivicHealth, useAnalyticsSummary } from '@/hooks/useAnalytics';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from 'recharts';

export function AnalyticsCivicHealthPage() {
  const { t } = useTranslation();
  const healthQuery = useCivicHealth();
  const summaryQuery = useAnalyticsSummary();

  if (healthQuery.error) {
    return (
      <PageContainer title={t('analytics.civicHealthTitle')}>
        <ErrorState title={t('analytics.couldNotLoadData')} onRetry={() => void healthQuery.refetch()} />
      </PageContainer>
    );
  }

  const health = healthQuery.data;
  const summary = summaryQuery.data;

  const score = health?.civic_health_score ?? 0;

  return (
    <PageContainer
      title={t('analytics.civicHealthTitle')}
      description={t('analytics.civicHealthDesc')}
    >
      <div className="space-y-6">
        {/* Health score gauge */}
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6">
            <div className="relative w-64">
              {healthQuery.isLoading ? (
                <Skeleton className="h-48 w-full rounded-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    data={[{ name: 'score', value: score, fill: getScoreColor(score) }]}
                    startAngle={180}
                    endAngle={0}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold" style={{ color: getScoreColor(score) }}>
                  {score}
                </span>
                <span className="text-xs text-muted-foreground">{t('analytics.scoreOutOf')}</span>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold">{t('analytics.healthScoreTitle')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{getScoreLabel(score, t)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard icon={Users} label={t('analytics.kpiTotalCitizens')} value={health?.total_citizens} loading={healthQuery.isLoading} />
          <MetricCard icon={Activity} label={t('analytics.kpiActiveCitizens')} value={health?.active_citizens} loading={healthQuery.isLoading} />
          <MetricCard icon={CheckCircle2} label={t('analytics.kpiResolutionRate')} value={summary ? `${summary.resolution_rate}%` : undefined} loading={summaryQuery.isLoading} />
          <MetricCard icon={Heart} label={t('analytics.kpiEngagementRate')} value={health ? `${health.engagement_rate}%` : undefined} loading={healthQuery.isLoading} />
        </div>

        {/* Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4" />
              {t('analytics.scoreBreakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm font-medium">{t('analytics.resolutionWeight')}</span>
              <span className="font-mono text-sm">{summary?.resolution_rate ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm font-medium">{t('analytics.engagementWeight')}</span>
              <span className="font-mono text-sm">{health?.engagement_rate ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-primary/5 p-3">
              <span className="text-sm font-bold">{t('analytics.compositeScore')}</span>
              <span className="font-mono text-lg font-bold text-primary">{score} / 100</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function MetricCard({ icon: Icon, label, value, loading }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number | undefined; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        {loading ? <Skeleton className="mt-2 h-7 w-16" /> : <p className="mt-1 text-2xl font-bold">{value ?? '—'}</p>}
      </CardContent>
    </Card>
  );
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function getScoreLabel(score: number, t: (k: string) => string): string {
  if (score >= 70) return t('analytics.scoreExcellent');
  if (score >= 40) return t('analytics.scoreModerate');
  return t('analytics.scoreNeedsAttention');
}
