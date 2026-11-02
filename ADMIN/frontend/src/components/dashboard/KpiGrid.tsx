import {
  FileText,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Timer,
  RotateCcw,
  Package,
} from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { StatCard } from '@/components/dashboard/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardKpis } from '@/services/dashboard';

export function KpiGrid({ kpis, loading }: { kpis?: DashboardKpis; loading: boolean }) {
  const { t } = useTranslation();
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label={t('dashboard.kpiTotal')} value={kpis.total} icon={Package} />
      <StatCard label={t('dashboard.kpiActive')} value={kpis.active} icon={Loader2} />
      <StatCard label={t('dashboard.kpiPendingVerification')} value={kpis.pending_verification} icon={Clock} />
      <StatCard label={t('dashboard.kpiDueSoon')} value={kpis.due_soon} icon={FileText} />
      <StatCard label={t('dashboard.kpiSlaBreached')} value={kpis.sla_breached} icon={AlertTriangle} />
      <StatCard label={t('dashboard.kpiResolved')} value={kpis.resolved} icon={CheckCircle2} />
      <StatCard
        label={t('dashboard.kpiAvgResolution')}
        value={kpis.avg_resolution_hours !== null ? `${kpis.avg_resolution_hours}h` : '—'}
        icon={Timer}
      />
      <StatCard label={t('dashboard.kpiReopened')} value={kpis.reopened} icon={RotateCcw} />
    </div>
  );
}
