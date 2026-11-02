import { useState, useMemo } from 'react';
import { useTranslation } from '@/i18n/translate';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { TrendBucket } from '@/types';

type Range = 'daily' | 'weekly' | 'monthly';

interface ChartPoint {
  date: string;
  label: string;
  submitted: number;
  resolved: number;
}

function formatTooltipDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function CustomTooltip({
  active,
  payload,
  label,
  data,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>;
  label?: string;
  data?: ChartPoint[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const point = data?.find((d) => d.label === label);
  const dateStr = point?.date ?? '';

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="mb-2 text-xs font-semibold text-foreground">
        {dateStr ? formatTooltipDate(dateStr) : label}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ data, loading }: { data?: TrendBucket[]; loading: boolean }) {
  const { t } = useTranslation();
  const [range, setRange] = useState<Range>('daily');

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!data || data.length === 0) return [];

    if (range === 'daily') {
      return data.map((d) => ({
        ...d,
        label: d.date.slice(5),
      }));
    }

    if (range === 'weekly') {
      const weeks = new Map<string, ChartPoint>();
      for (const d of data) {
        const date = new Date(d.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const key = weekStart.toISOString().slice(0, 10);
        if (!weeks.has(key)) {
          weeks.set(key, {
            date: key,
            label: key.slice(5),
            submitted: 0,
            resolved: 0,
          });
        }
        const w = weeks.get(key)!;
        w.submitted += d.submitted;
        w.resolved += d.resolved;
      }
      return Array.from(weeks.values());
    }

    const months = new Map<string, ChartPoint>();
    for (const d of data) {
      const key = d.date.slice(0, 7);
      const monthLabel = new Date(key + '-01').toLocaleDateString('en-IN', {
        month: 'short',
        year: '2-digit',
      });
      if (!months.has(key)) {
        months.set(key, {
          date: key + '-01',
          label: monthLabel,
          submitted: 0,
          resolved: 0,
        });
      }
      const m = months.get(key)!;
      m.submitted += d.submitted;
      m.resolved += d.resolved;
    }
    return Array.from(months.values());
  }, [data, range]);

  const totalSubmitted = useMemo(
    () => chartData.reduce((sum, d) => sum + d.submitted, 0),
    [chartData],
  );
  const totalResolved = useMemo(
    () => chartData.reduce((sum, d) => sum + d.resolved, 0),
    [chartData],
  );

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('dashboard.trendTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">{t('dashboard.trendTitle')}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('dashboard.trendSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {(['daily', 'weekly', 'monthly'] as Range[]).map((r) => (
            <Button
              key={r}
              variant={range === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRange(r)}
              className="h-7 px-2.5 text-xs capitalize"
            >
              {t(`dashboard.${r}`)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="mb-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">{t('dashboard.legendSubmitted')}</span>
            <span className="font-semibold text-foreground">{totalSubmitted}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">{t('dashboard.legendResolved')}</span>
            <span className="font-semibold text-foreground">{totalResolved}</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="grad-submitted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="grad-resolved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.4}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.4 }}
              minTickGap={20}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={35}
            />
            <Tooltip content={<CustomTooltip data={chartData} />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              type="monotone"
              dataKey="submitted"
              name={t('dashboard.legendSubmitted')}
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#grad-submitted)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="resolved"
              name={t('dashboard.legendResolved')}
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#grad-resolved)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
