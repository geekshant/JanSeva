import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  Users,
  Activity,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Bot,
  AlertTriangle,
  RotateCcw,
  Gauge,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/PageContainer';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { CategoryDistribution } from '@/components/dashboard/CategoryDistribution';
import {
  useAnalyticsSummary,
  useTrends,
  useByCategory,
  useByStatus,
  useDepartmentStats,
  useAiAnalytics,
} from '@/hooks/useAnalytics';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import type { ComplaintStatus, DepartmentAnalytics } from '@/types';

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

// ---------------------------------------------------------------------------
// Partial-failure inline error (does NOT blank the page)
// ---------------------------------------------------------------------------

function InlineError({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-12 text-center ${className ?? ''}`}>
      <AlertCircle className="h-6 w-6 text-destructive" />
      <p className="text-sm text-muted-foreground">{t('analytics.sectionFailed')}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1 h-7 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          {t('analytics.retry')}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({
  icon: Icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | undefined;
  loading: boolean;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <Icon className={`h-4 w-4 ${accent ?? 'text-muted-foreground'}`} />
        </div>
        {loading ? <Skeleton className="mt-2 h-7 w-16" /> : <p className="mt-1 text-2xl font-bold">{value ?? '—'}</p>}
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

function QuickLink({ to, icon: Icon, title }: { to: string; icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/50">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function AnalyticsOverviewPage() {
  const { t } = useTranslation();
  const [days, setDays] = useState(30);

  const summaryQuery = useAnalyticsSummary();
  const trendsQuery = useTrends(days);
  const categoryQuery = useByCategory();
  const statusQuery = useByStatus();
  const deptQuery = useDepartmentStats();
  const aiQuery = useAiAnalytics();

  return (
    <PageContainer
      title={t('analytics.overviewTitle')}
      description={t('analytics.overviewDesc')}
    >
      <div className="space-y-6">
        {/* Date range selector */}
        <div className="flex items-center justify-end gap-2">
          <label className="text-sm text-muted-foreground">{t('analytics.dateRange')}</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 pr-8 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value={7}>{t('analytics.last7Days')}</option>
            <option value={30}>{t('analytics.last30Days')}</option>
            <option value={90}>{t('analytics.last90Days')}</option>
          </select>
        </div>

        {/* KPI cards — summary section (independent, partial failure) */}
        {summaryQuery.error ? (
          <Card>
            <CardContent className="py-6">
              <InlineError onRetry={() => void summaryQuery.refetch()} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard icon={BarChart3} label={t('analytics.kpiTotalComplaints')} value={summaryQuery.data?.total} loading={summaryQuery.isLoading} />
            <KpiCard icon={TrendingUp} label={t('analytics.kpiResolutionRate')} value={summaryQuery.data ? `${summaryQuery.data.resolution_rate}%` : undefined} loading={summaryQuery.isLoading} accent="text-green-600" />
            <KpiCard icon={Clock} label={t('analytics.kpiAvgResolution')} value={summaryQuery.data?.avg_resolution_hours != null ? `${summaryQuery.data.avg_resolution_hours}h` : '—'} loading={summaryQuery.isLoading} />
            <KpiCard icon={Users} label={t('analytics.kpiActiveCitizens')} value={summaryQuery.data?.citizens} loading={summaryQuery.isLoading} />
            <KpiCard icon={CheckCircle2} label={t('analytics.kpiResolved')} value={summaryQuery.data?.resolved} loading={summaryQuery.isLoading} accent="text-green-600" />
            <KpiCard icon={Gauge} label={t('analytics.kpiSlaCompliance')} value={summaryQuery.data ? `${summaryQuery.data.sla_compliance_rate}%` : undefined} loading={summaryQuery.isLoading} />
            <KpiCard icon={RotateCcw} label={t('analytics.kpiReopened')} value={summaryQuery.data?.reopened_count} loading={summaryQuery.isLoading} accent="text-amber-600" />
            <KpiCard icon={AlertTriangle} label={t('analytics.kpiEscalated')} value={summaryQuery.data?.escalation_count} loading={summaryQuery.isLoading} accent="text-red-600" />
          </div>
        )}

        {/* Charts grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {trendsQuery.error ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('analytics.submittedVsResolved')}</CardTitle>
              </CardHeader>
              <CardContent>
                <InlineError onRetry={() => void trendsQuery.refetch()} />
              </CardContent>
            </Card>
          ) : (
            <TrendChart data={trendsQuery.data} loading={trendsQuery.isLoading} />
          )}

          {categoryQuery.error ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('analytics.byCategory')}</CardTitle>
              </CardHeader>
              <CardContent>
                <InlineError onRetry={() => void categoryQuery.refetch()} />
              </CardContent>
            </Card>
          ) : (
            <CategoryDistribution data={categoryQuery.data} loading={categoryQuery.isLoading} />
          )}
        </div>

        {/* Status breakdown + AI analytics */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                {t('analytics.statusBreakdown')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusQuery.error ? (
                <InlineError onRetry={() => void statusQuery.refetch()} />
              ) : statusQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : statusQuery.data && statusQuery.data.length > 0 ? (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusQuery.data.map((s) => ({ name: t('status.' + s.status.toLowerCase()), value: s.count }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                      >
                        {statusQuery.data.map((s) => (
                          <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? '#6b7280'} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {statusQuery.data.map((s) => (
                      <div key={s.status} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] }} />
                          {t('status.' + s.status.toLowerCase())}
                        </span>
                        <span className="font-medium">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('analytics.noData')}</p>
              )}
            </CardContent>
          </Card>

          {/* AI Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4" />
                {t('analytics.aiAnalytics')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiQuery.error ? (
                <InlineError onRetry={() => void aiQuery.refetch()} />
              ) : aiQuery.isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : aiQuery.data ? (
                <AiAnalyticsContent data={aiQuery.data} />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('analytics.noData')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SLA summary */}
        {summaryQuery.data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                {t('analytics.slaSummary')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
                <SlaStat label={t('analytics.slaOnTrack')} value={summaryQuery.data.sla.on_track} color="text-green-600" />
                <SlaStat label={t('analytics.slaDueSoon')} value={summaryQuery.data.sla.due_soon} color="text-amber-600" />
                <SlaStat label={t('analytics.slaAtRisk')} value={summaryQuery.data.sla.at_risk} color="text-orange-600" />
                <SlaStat label={t('analytics.slaBreached')} value={summaryQuery.data.sla.breached} color="text-red-600" />
                <SlaStat label={t('analytics.slaEscalated')} value={summaryQuery.data.sla.escalated} color="text-red-700" />
                <SlaStat label={t('analytics.slaResolved')} value={summaryQuery.data.sla.resolved} color="text-green-700" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Department performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              {t('analytics.departmentPerformance')}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t('analytics.departmentPerformanceDesc')}</p>
          </CardHeader>
          <CardContent>
            {deptQuery.error ? (
              <InlineError onRetry={() => void deptQuery.refetch()} />
            ) : deptQuery.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : deptQuery.data && deptQuery.data.length > 0 ? (
              <DepartmentTable data={deptQuery.data} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('analytics.noDeptData')}</p>
            )}
          </CardContent>
        </Card>

        {/* Quick links to detailed analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('analytics.detailedReports')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickLink to="/analytics/complaints" icon={BarChart3} title={t('analytics.quickLinkComplaints')} />
            <QuickLink to="/analytics/resolution" icon={CheckCircle2} title={t('analytics.quickLinkResolution')} />
            <QuickLink to="/analytics/departments" icon={Activity} title={t('analytics.quickLinkDepartments')} />
            <QuickLink to="/analytics/wards" icon={TrendingUp} title={t('analytics.quickLinkWards')} />
            <QuickLink to="/analytics/civic-health" icon={Users} title={t('analytics.quickLinkCivicHealth')} />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// AI Analytics content
// ---------------------------------------------------------------------------

function AiAnalyticsContent({ data }: { data: NonNullable<ReturnType<typeof useAiAnalytics>['data']> }) {
  const { t } = useTranslation();

  const aiData = [
    { name: t('analytics.kpiAiVerified'), value: data.ai_verified, color: '#22c55e' },
    { name: t('analytics.kpiAiFailed'), value: data.ai_failed, color: '#ef4444' },
    { name: t('analytics.kpiAiReviewRequired'), value: data.ai_review_required, color: '#f97316' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      {/* AI KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border p-3 text-center">
          <Bot className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-xl font-bold">{data.total_analyzed}</p>
          <p className="text-xs text-muted-foreground">{t('analytics.kpiAiTotalAnalyzed')}</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-green-600" />
          <p className="text-xl font-bold text-green-600">{data.ai_verified}</p>
          <p className="text-xs text-muted-foreground">{t('analytics.kpiAiVerified')}</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <XCircle className="mx-auto mb-1 h-4 w-4 text-red-600" />
          <p className="text-xl font-bold text-red-600">{data.ai_failed}</p>
          <p className="text-xs text-muted-foreground">{t('analytics.kpiAiFailed')}</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <Gauge className="mx-auto mb-1 h-4 w-4 text-blue-600" />
          <p className="text-xl font-bold text-blue-600">{data.ai_success_rate}%</p>
          <p className="text-xs text-muted-foreground">{t('analytics.kpiAiSuccessRate')}</p>
        </div>
      </div>

      {/* Pending / errors row */}
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="text-muted-foreground">{t('analytics.aiPendingAnalysis')}:</span>
          <span className="font-medium">{data.ai_analysis_pending}</span>
        </span>
        {data.ai_analysis_error > 0 && (
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">{t('analytics.aiAnalysisErrors')}:</span>
            <span className="font-medium text-red-600">{data.ai_analysis_error}</span>
          </span>
        )}
      </div>

      {/* AI decision breakdown bar chart */}
      {aiData.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">{t('analytics.aiDecisionBreakdown')}</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={aiData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={110} />
              <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
                {aiData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Department table
// ---------------------------------------------------------------------------

function DepartmentTable({ data }: { data: DepartmentAnalytics[] }) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">{t('analytics.tableDepartment')}</th>
            <th className="pb-2 pr-4 text-right font-medium">{t('analytics.tableTotal')}</th>
            <th className="pb-2 pr-4 text-right font-medium">{t('analytics.tableResolved')}</th>
            <th className="pb-2 pr-4 text-right font-medium">{t('analytics.tableInProgress')}</th>
            <th className="pb-2 pr-4 text-right font-medium">{t('analytics.tableResolutionRate')}</th>
            <th className="pb-2 pr-4 text-right font-medium">{t('analytics.tableAvgResolution')}</th>
            <th className="pb-2 pr-4 text-right font-medium">{t('analytics.tableSlaBreached')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.department_id ?? d.department_name} className="border-b last:border-0 hover:bg-muted/30">
              <td className="py-2 pr-4">
                <span className="font-medium">{d.department_name}</span>
                {d.department_code && (
                  <span className="ml-1 text-xs text-muted-foreground">({d.department_code})</span>
                )}
              </td>
              <td className="py-2 pr-4 text-right font-medium">{d.total}</td>
              <td className="py-2 pr-4 text-right text-green-600">{d.resolved}</td>
              <td className="py-2 pr-4 text-right text-amber-600">{d.in_progress}</td>
              <td className="py-2 pr-4 text-right">
                <span className={d.resolution_rate >= 70 ? 'font-medium text-green-600' : d.resolution_rate >= 40 ? 'font-medium text-amber-600' : 'font-medium text-red-600'}>
                  {d.resolution_rate}%
                </span>
              </td>
              <td className="py-2 pr-4 text-right text-muted-foreground">{d.avg_resolution_hours > 0 ? `${d.avg_resolution_hours}h` : '—'}</td>
              <td className="py-2 pr-4 text-right">
                <span className={d.sla_breached > 0 ? 'font-medium text-red-600' : 'text-muted-foreground'}>
                  {d.sla_breached}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
