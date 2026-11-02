import { MapPin, Activity, Repeat } from 'lucide-react';
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
import { useWardStats, useHotZones } from '@/hooks/useAnalytics';
import type { WardAnalytics } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';

export function AnalyticsWardsPage() {
  const { t } = useTranslation();
  const wardQuery = useWardStats();
  const hotZonesQuery = useHotZones();

  if (wardQuery.error) {
    return (
      <PageContainer title={t('analytics.wardsTitle')}>
        <ErrorState title={t('analytics.couldNotLoadData')} onRetry={() => void wardQuery.refetch()} />
      </PageContainer>
    );
  }

  const data: WardAnalytics[] = wardQuery.data ?? [];

  return (
    <PageContainer
      title={t('analytics.wardsTitle')}
      description={t('analytics.wardsDesc')}
    >
      <div className="space-y-6">
        {/* Ward bar chart — complaint volume + active + resolved */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              {t('analytics.complaintVolumeByWard')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wardQuery.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="ward" tick={{ fontSize: 11 }} width={100} />
                  <RechartsTooltip />
                  <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} name={t('analytics.tableTotal')} />
                  <Bar dataKey="resolved" fill="#22c55e" radius={[0, 4, 4, 0]} name={t('analytics.tableResolved')} />
                  <Bar dataKey="active" fill="#f59e0b" radius={[0, 4, 4, 0]} name={t('analytics.tableActive')} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('analytics.noWardData')}</p>
            )}
          </CardContent>
        </Card>

        {/* Detailed ward table */}
        {data.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('analytics.tableWard')}</TableHead>
                  <TableHead>{t('analytics.tableTotal')}</TableHead>
                  <TableHead>{t('analytics.tableResolved')}</TableHead>
                  <TableHead>{t('analytics.tablePending')}</TableHead>
                  <TableHead>{t('analytics.tableActive')}</TableHead>
                  <TableHead>{t('analytics.tableResolutionRate')}</TableHead>
                  <TableHead>{t('analytics.tableTopCategory')}</TableHead>
                  <TableHead>{t('analytics.tableRecurring')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((w) => (
                  <TableRow key={w.ward}>
                    <TableCell className="text-sm font-medium">{w.ward}</TableCell>
                    <TableCell className="text-sm">{w.total}</TableCell>
                    <TableCell className="text-sm text-green-600">{w.resolved}</TableCell>
                    <TableCell className="text-sm">{w.pending}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Activity className="h-3 w-3 text-amber-500" />
                        {w.active}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={w.resolution_rate >= 50 ? 'success' : w.resolution_rate >= 25 ? 'warning' : 'destructive'}>
                        {w.resolution_rate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {w.top_category ?? '—'}
                    </TableCell>
                    <TableCell>
                      {w.recurring_count > 0 ? (
                        <span className="flex items-center gap-1 text-sm text-orange-600">
                          <Repeat className="h-3 w-3" />
                          {w.recurring_count}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Hot zones (PostGIS heatmap data) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-red-500" />
              {t('analytics.complaintHotZones')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hotZonesQuery.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : hotZonesQuery.data && hotZonesQuery.data.length > 0 ? (
              <div className="space-y-2">
                {hotZonesQuery.data.map((zone, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/15 text-sm font-bold text-red-600">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {zone.top_category ?? t('common.unknown')} · {zone.top_severity ?? '—'}
                        </p>
                      </div>
                    </div>
                    {/* Heat intensity bar */}
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-red-500"
                          style={{ width: `${Math.min(100, zone.complaint_count * 10)}%` }}
                        />
                      </div>
                      <Badge variant="destructive">{zone.complaint_count}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('analytics.noHotZones')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
