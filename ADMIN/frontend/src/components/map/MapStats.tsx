import { MapPin, Flame, AlertTriangle, Clock } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import type { MapComplaint } from '@/types/map';
import { isValidCoordinate } from '@/types/map';

// ---------------------------------------------------------------------------
// MapStats — overlay statistics panel showing counts from visible complaints.
// All stats reflect the currently selected filters and viewport data.
// ---------------------------------------------------------------------------

interface MapStatsProps {
  complaints: MapComplaint[];
  total: number;
}

export function MapStats({ complaints, total }: MapStatsProps) {
  const { t } = useTranslation();
  // Filter valid coordinates for accurate stats
  const valid = complaints.filter((c) => isValidCoordinate(c.lat, c.lng));

  // Count critical issues
  const criticalCount = valid.filter(
    (c) => c.severity === 'CRITICAL' || c.severity === 'HIGH',
  ).length;

  // Count SLA breached (deadline passed, not resolved/rejected)
  const slaBreached = valid.filter((c) => {
    if (c.status === 'RESOLVED' || c.status === 'REJECTED') return false;
    if (!c.sla_deadline) return false;
    return new Date(c.sla_deadline).getTime() < Date.now();
  }).length;

  // Estimate hotspots — areas with 5+ complaints within ~200m
  // Simple grid-based detection (not PostGIS-accurate but sufficient for overlay)
  const hotspots = countHotspots(valid);

  // Highest density ward
  const wardCounts = new Map<string, number>();
  valid.forEach((c) => {
    if (c.ward) wardCounts.set(c.ward, (wardCounts.get(c.ward) ?? 0) + 1);
  });
  const topWard = [...wardCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="absolute right-3 top-3 z-10 space-y-1.5">
      <div className="rounded-lg bg-background/95 px-3 py-2 shadow-lg">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <div>
              <span className="font-bold">{valid.length}</span>
              <span className="text-muted-foreground">{t('map.visible')}</span>
            </div>
          </div>
          {total > valid.length && (
            <div className="text-muted-foreground">
              {t('map.ofTotal', { total })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <StatChip icon={Flame} label={t('map.hotspots')} value={hotspots} color="text-orange-500" />
        <StatChip icon={AlertTriangle} label={t('map.critical')} value={criticalCount} color="text-red-500" />
        <StatChip icon={Clock} label={t('map.slaBreached')} value={slaBreached} color="text-red-500" />
        {topWard && (
          <div className="flex items-center gap-1.5 rounded-lg bg-background/95 px-2 py-1.5 shadow-lg">
            <MapPin className="h-3 w-3 text-primary" />
            <div className="text-[10px]">
              <span className="font-bold">{topWard[0]}</span>
              <span className="text-muted-foreground"> ({topWard[1]})</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof MapPin;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-background/95 px-2 py-1.5 shadow-lg">
      <Icon className={`h-3 w-3 ${color}`} />
      <div className="text-[10px]">
        <span className="font-bold">{value}</span>
        <span className="text-muted-foreground"> {label}</span>
      </div>
    </div>
  );
}

/** Simple grid-based hotspot detection: counts ~200m grid cells with 5+ complaints. */
function countHotspots(complaints: MapComplaint[]): number {
  const grid = new Map<string, number>();
  // ~0.002 degrees ≈ 200m at equator
  const gridSize = 0.002;
  complaints.forEach((c) => {
    const key = `${Math.floor(c.lat / gridSize)}_${Math.floor(c.lng / gridSize)}`;
    grid.set(key, (grid.get(key) ?? 0) + 1);
  });
  return [...grid.values()].filter((v) => v >= 5).length;
}
