import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, AlertTriangle, MapPin, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DashboardMapComplaint } from '@/types/map';

export function AiCivicInsights({
  complaints,
  loading,
}: {
  complaints: DashboardMapComplaint[];
  loading: boolean;
}) {
  const { t } = useTranslation();

  const insights = useMemo(() => {
    if (!complaints.length) return { topCategory: null, topWard: null, criticalCount: 0, hotspots: [] };

    // Top category by count
    const catCounts: Record<string, number> = {};
    const wardCounts: Record<string, number> = {};
    let criticalCount = 0;

    for (const c of complaints) {
      const cat = c.category_name ?? 'Unknown';
      catCounts[cat] = (catCounts[cat] ?? 0) + 1;
      if (c.ward) wardCounts[c.ward] = (wardCounts[c.ward] ?? 0) + 1;
      if (c.severity === 'CRITICAL' || c.severity === 'HIGH') criticalCount++;
    }

    const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0] ?? null;
    const topWard = Object.entries(wardCounts).sort((a, b) => b[1] - a[1])[0] ?? null;

    // Hotspots: wards with 3+ complaints
    const hotspots = Object.entries(wardCounts)
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { topCategory, topWard, criticalCount, hotspots };
  }, [complaints]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{t('dashboard.aiCivicInsights')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!complaints.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{t('dashboard.aiCivicInsights')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('dashboard.noInsights')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">{t('dashboard.aiCivicInsights')}</CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link to="/complaints/ai-review">
            {t('dashboard.viewAll')}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Top category */}
        {insights.topCategory && (
          <InsightRow
            icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
            title={t('dashboard.topCategory')}
            value={insights.topCategory[0]}
            countLabel={`(${insights.topCategory[1]} ${t('common.complaints', { count: insights.topCategory[1] })})`}
          />
        )}

        {/* Top ward / hotspot */}
        {insights.topWard && (
          <InsightRow
            icon={<MapPin className="h-4 w-4 text-amber-500" />}
            title={t('dashboard.topWard')}
            value={insights.topWard[0]}
            countLabel={`(${insights.topWard[1]} ${t('common.complaints', { count: insights.topWard[1] })})`}
          />
        )}

        {/* Critical count */}
        {insights.criticalCount > 0 && (
          <InsightRow
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            title={t('dashboard.highPriorityComplaints')}
            value={String(insights.criticalCount)}
          />
        )}

        {/* Hotspots */}
        {insights.hotspots.length > 0 && (
          <div className="border-t pt-2">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('dashboard.clusterHotspots')}</p>
            <div className="flex flex-wrap gap-1.5">
              {insights.hotspots.map(([ward, count]) => (
                <span
                  key={ward}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                >
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  {ward}
                  <span className="font-semibold">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightRow({
  icon,
  title,
  value,
  countLabel,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  countLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{title}</p>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold">{value}</p>
          {countLabel && (
            <span className="text-xs text-muted-foreground">{countLabel}</span>
          )}
        </div>
      </div>
    </div>
  );
}
