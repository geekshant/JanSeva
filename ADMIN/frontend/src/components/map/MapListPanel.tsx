import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import { MapPin, Clock } from 'lucide-react';
import { StatusBadge, SeverityBadge } from '@/components/common/StatusBadge';
import { SlaBadge } from '@/components/common/SlaBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { MapComplaint } from '@/types/map';
import { getMarkerColor } from '@/types/map';
import { computeSlaState } from '@/types';
import type { ComplaintSeverity, SlaState } from '@/types';

interface MapListPanelProps {
  complaints: MapComplaint[];
  loading: boolean;
  total: number;
  selectedId: string | null;
  onSelect: (complaint: MapComplaint) => void;
}

export function MapListPanel({
  complaints,
  loading,
  total,
  selectedId,
  onSelect,
}: MapListPanelProps) {
  const { t } = useTranslation();
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-scroll the selected complaint card into view.
  useEffect(() => {
    if (!selectedId) return;
    const el = cardRefs.current[selectedId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedId]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">
          {loading ? t('common.loading') : t('map.complaintsCount', { count: complaints.length, total })}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div>
              <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('map.noComplaintsInArea')}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {complaints.map((c) => {
              const isSelected = c.id === selectedId;
              const color = getMarkerColor(c.status, c.severity, c.sla_deadline);
              const slaState: SlaState = computeSlaState(
                c.sla_deadline,
                c.status,
                c.severity as ComplaintSeverity,
              );

              return (
                <div
                  key={c.id}
                  ref={(el) => { cardRefs.current[c.id] = el; }}
                  onClick={() => onSelect(c)}
                  className={cn(
                    'cursor-pointer rounded-md border p-2.5 transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-muted/50',
                  )}
                >
                  <div className="flex items-start gap-2">
                    {/* Color dot */}
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: color }}
                    />

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.complaint_number}
                        </span>
                      </div>
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={c.status} />
                        <SeverityBadge severity={c.severity} />
                        <SlaBadge state={slaState} />
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                        {c.category_name && <span>{c.category_name}</span>}
                        {c.ward && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />
                              {c.ward}
                            </span>
                          </>
                        )}
                      </div>
                      {c.sla_deadline && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(c.sla_deadline).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>

                    {/* Open button */}
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link to={`/complaints/${c.id}`}>{t('map.openComplaint')}</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
