import { Link } from 'react-router-dom';
import { X, MapPin, Clock, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SeverityBadge } from '@/components/common/StatusBadge';
import type { DashboardMapComplaint } from '@/types/map';
import { getMarkerColor } from '@/types/map';

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

export function ComplaintPreviewPanel({
  complaint,
  onClose,
}: {
  complaint: DashboardMapComplaint;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const color = getMarkerColor(complaint.status, complaint.severity, complaint.sla_deadline);

  return (
    <div className="absolute right-0 top-0 z-20 h-full w-80 max-w-[85%] border-l bg-background shadow-xl">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: color }}
            />
            <span className="text-sm font-semibold">{complaint.complaint_number}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Title */}
          <h3 className="mb-3 text-base font-semibold leading-snug">
            {complaint.title}
          </h3>

          {/* Category */}
          {complaint.category_name && (
            <div className="mb-3">
              <span className="text-xs text-muted-foreground">{t('map.complaintCategory')}</span>
              <p className="text-sm font-medium">{complaint.category_name}</p>
            </div>
          )}

          {/* Status + Severity */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={complaint.status} />
            <SeverityBadge severity={complaint.severity} />
          </div>

          {/* Ward */}
          {complaint.ward && (
            <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{complaint.ward}</span>
            </div>
          )}

          {/* Address */}
          {complaint.address && (
            <div className="mb-3 text-xs text-muted-foreground">
              {complaint.address}
            </div>
          )}

          {/* Time */}
          <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{t('map.submitted')} {timeAgo(complaint.created_at, t)}</span>
          </div>

          {/* Location status */}
          {!complaint.has_location && (
            <div className="mb-3 rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
              {t('map.locationUnavailable')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-3">
          <Button asChild className="w-full" size="sm">
            <Link to={`/complaints/${complaint.id}`}>
              <ExternalLink className="h-4 w-4" />
              {t('map.viewComplaint')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
