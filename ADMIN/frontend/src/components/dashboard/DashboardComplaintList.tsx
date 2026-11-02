import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AiDecisionBadge } from '@/components/common/AiDecisionBadge';
import type { DashboardMapComplaint } from '@/types/map';
import { getMarkerColor } from '@/types/map';
import { cn } from '@/lib/utils';

function timeAgo(iso: string, t: (k: string, o?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('time.justNow');
  if (mins < 60) return t('time.minAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('time.hrAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('time.dayAgo', { count: days });
}

export function DashboardComplaintList({
  complaints,
  loading,
  selectedId,
  onSelect,
}: {
  complaints: DashboardMapComplaint[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (complaint: DashboardMapComplaint) => void;
}) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-scroll to selected complaint
  useEffect(() => {
    if (!selectedId) return;
    const el = itemRefs.current[selectedId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedId]);

  const recent = complaints.slice(0, 15);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">{t('dashboard.recentComplaints')}</CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link to="/complaints">
            {t('common.viewAll')}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div ref={listRef} className="max-h-[300px] space-y-1.5 overflow-y-auto">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
            ))
          ) : recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('map.noComplaintsMsg')}
            </p>
          ) : (
            recent.map((c) => {
              const color = getMarkerColor(c.status, c.severity, c.sla_deadline);
              const isSelected = c.id === selectedId;
              return (
                <div
                  key={c.id}
                  ref={(el) => { itemRefs.current[c.id] = el; }}
                  onClick={() => onSelect(c)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors',
                    isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                  )}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{c.complaint_number}</span>
                      {c.category_name && (
                        <span className="truncate text-xs text-muted-foreground">{c.category_name}</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      {c.ward && <span>{c.ward}</span>}
                      <span>{timeAgo(c.created_at, t)}</span>
                      {!c.has_location && (
                        <span className="text-amber-600">{t('map.locationUnavailable')}</span>
                      )}
                    </div>
                    {c.ai_decision && (
                      <div className="mt-0.5 flex items-center gap-1">
                        <AiDecisionBadge
                          decision={c.ai_decision}
                          aiStatus={c.ai_status}
                          reason={c.ai_reason}
                          categoryMatch={c.ai_category_match}
                          evidenceQuality={c.ai_evidence_quality}
                          imageCount={c.ai_image_count}
                          detectedCategory={c.ai_detected_category}
                          selectedCategory={c.ai_selected_category}
                        />
                        {c.ai_reason && (
                          <span className="truncate text-[10px] text-muted-foreground" title={c.ai_reason}>
                            {c.ai_reason}
                          </span>
                        )}
                      </div>
                    )}
                    {!c.ai_decision && (
                      <div className="mt-0.5">
                        <AiDecisionBadge
                          decision={null}
                          aiStatus={c.ai_status}
                        />
                      </div>
                    )}
                  </div>
                  <StatusBadge status={c.status} className="shrink-0" />
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
