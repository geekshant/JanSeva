import { Building2, Clock, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/common/ErrorState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDepartmentStats } from '@/hooks/useAnalytics';
import type { DepartmentAnalytics } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';

export function AnalyticsDepartmentsPage() {
  const { t } = useTranslation();
  const deptQuery = useDepartmentStats();

  if (deptQuery.error) {
    return (
      <PageContainer title={t('analytics.departmentsTitle')}>
        <ErrorState title={t('analytics.couldNotLoadData')} onRetry={() => void deptQuery.refetch()} />
      </PageContainer>
    );
  }

  const data: DepartmentAnalytics[] = deptQuery.data ?? [];

  return (
    <PageContainer
      title={t('analytics.departmentsTitle')}
      description={t('analytics.departmentsDesc')}
    >
      <div className="space-y-6">
        {/* Bar chart — workload by department */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              {t('analytics.workloadByDept')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deptQuery.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.map((d) => ({ name: d.department_name, total: d.total, resolved: d.resolved, pending: d.pending, 'in progress': d.in_progress }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <RechartsTooltip />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name={t('analytics.tableTotal')} />
                  <Bar dataKey="resolved" fill="#22c55e" radius={[4, 4, 0, 0]} name={t('analytics.tableResolved')} />
                  <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name={t('analytics.tablePending')} />
                  <Bar dataKey="in progress" fill="#8b5cf6" radius={[4, 4, 0, 0]} name={t('analytics.tableInProgress')} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('analytics.noDeptData')}</p>
            )}
          </CardContent>
        </Card>

        {/* Resolution time comparison */}
        {data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                {t('analytics.avgResolutionTime')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.map((d) => ({ name: d.department_name, hours: d.avg_resolution_hours }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <RechartsTooltip />
                  <Bar dataKey="hours" fill="#06b6d4" radius={[4, 4, 0, 0]} name={t('analytics.tableAvgResolution')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Detailed table */}
        {data.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('analytics.tableDepartment')}</TableHead>
                  <TableHead>{t('analytics.tableCode')}</TableHead>
                  <TableHead>{t('analytics.tableTotal')}</TableHead>
                  <TableHead>{t('analytics.tableResolved')}</TableHead>
                  <TableHead>{t('analytics.tableInProgress')}</TableHead>
                  <TableHead>{t('analytics.tablePending')}</TableHead>
                  <TableHead>{t('analytics.tableResolutionRate')}</TableHead>
                  <TableHead>{t('analytics.tableAvgResolution')}</TableHead>
                  <TableHead>{t('analytics.tableSlaBreached')}</TableHead>
                  <TableHead>{t('analytics.tableSlaCompliance')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.department_id ?? 'unassigned'}>
                    <TableCell className="text-sm font-medium">{d.department_name}</TableCell>
                    <TableCell className="font-mono text-xs">{d.department_code}</TableCell>
                    <TableCell className="text-sm">{d.total}</TableCell>
                    <TableCell className="text-sm text-green-600">{d.resolved}</TableCell>
                    <TableCell className="text-sm text-amber-600">{d.in_progress}</TableCell>
                    <TableCell className="text-sm">{d.pending}</TableCell>
                    <TableCell>
                      <Badge variant={d.resolution_rate >= 50 ? 'success' : d.resolution_rate >= 25 ? 'warning' : 'destructive'}>
                        {d.resolution_rate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{d.avg_resolution_hours > 0 ? `${d.avg_resolution_hours}h` : '—'}</TableCell>
                    <TableCell>
                      {d.sla_breached > 0 ? (
                        <span className="flex items-center gap-1 text-sm text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          {d.sla_breached}
                        </span>
                      ) : (
                        <span className="text-sm text-green-600">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.sla_compliance_rate >= 70 ? 'success' : d.sla_compliance_rate >= 40 ? 'warning' : 'destructive'}>
                        {d.sla_compliance_rate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
