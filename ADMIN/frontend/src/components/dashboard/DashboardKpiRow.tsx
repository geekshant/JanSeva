import { Package, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardKpiSummary } from '@/services/dashboard';

export function DashboardKpiRow({
  kpis,
  loading,
}: {
  kpis: DashboardKpiSummary | null;
  loading: boolean;
}) {
  const { t } = useTranslation();

  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: t('dashboard.kpiTotal'),
      value: kpis.total,
      icon: Package,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: t('dashboard.kpiPending'),
      value: kpis.pending,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: t('dashboard.kpiInProgress'),
      value: kpis.inProgress,
      icon: Loader2,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: t('dashboard.kpiResolved'),
      value: kpis.resolved,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold">{card.value.toLocaleString()}</p>
              {kpis.locationUnavailable > 0 && card.label === t('dashboard.kpiTotal') && (
                <p className="text-[10px] text-muted-foreground">
                  {kpis.locationUnavailable} {t('map.locationUnavailable')}
                </p>
              )}
            </div>
            <div className={`rounded-full p-2.5 ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
