import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useTranslation } from '@/i18n/translate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CategoryBreakdown } from '@/types';

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#6366f1',
];

interface DonutPoint {
  name: string;
  value: number;
  percentage: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DonutPoint }>;
}) {
  const { t } = useTranslation();
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{
            backgroundColor: COLORS[(point.name.charCodeAt(0) || 0) % COLORS.length],
          }}
        />
        <span className="text-xs font-medium text-foreground">{point.name}</span>
      </div>
      <div className="mt-1 flex items-center gap-3 text-xs">
        <span className="text-muted-foreground">{t('dashboard.count')}</span>
        <span className="font-semibold text-foreground">{point.value}</span>
        <span className="text-muted-foreground">{t('dashboard.share')}</span>
        <span className="font-semibold text-foreground">{point.percentage.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function CategoryDistribution({
  data,
  loading,
}: {
  data?: CategoryBreakdown[];
  loading: boolean;
}) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('dashboard.categoryDistribution')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  const raw = (data ?? []).sort((a, b) => b.count - a.count);
  const total = raw.reduce((sum, d) => sum + d.count, 0);

  // Group small slices into "Other"
  const THRESHOLD = 3;
  const top = raw.slice(0, THRESHOLD);
  const rest = raw.slice(THRESHOLD);
  const chartData: DonutPoint[] = [
    ...top.map((d) => ({
      name: d.category,
      value: d.count,
      percentage: total > 0 ? (d.count / total) * 100 : 0,
    })),
    ...(rest.length > 0
      ? [{
          name: t('dashboard.otherCategories', { count: rest.length }),
          value: rest.reduce((s, d) => s + d.count, 0),
          percentage: total > 0
            ? (rest.reduce((s, d) => s + d.count, 0) / total) * 100
            : 0,
        }]
      : []),
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('dashboard.categoryDistribution')}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {total === 1
            ? t('dashboard.complaintsTotal_one', { total })
            : t('dashboard.complaintsTotal_other', { total })}
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">
            {t('dashboard.noComplaintData')}
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            {/* Donut chart */}
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend / breakdown list */}
            <div className="w-full flex-1 space-y-1.5">
              {chartData.map((d, i) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="truncate text-xs text-foreground">{d.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    <span className="font-medium text-foreground">{d.value}</span>
                    <span className="text-muted-foreground">{d.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
