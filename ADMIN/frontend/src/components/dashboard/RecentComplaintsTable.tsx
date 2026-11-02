import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, SeverityBadge } from '@/components/common/StatusBadge';
import { SlaBadge } from '@/components/common/SlaBadge';
import { EmptyState } from '@/components/common/EmptyState';
import type { ComplaintWithRelations, SlaState } from '@/types';
import { computeSlaState } from '@/types';

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

export function RecentComplaintsTable({
  complaints,
  loading,
}: {
  complaints?: ComplaintWithRelations[];
  loading: boolean;
}) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (!complaints || complaints.length === 0) {
    return <EmptyState title={t('dashboard.noComplaintsYet')} description={t('dashboard.noComplaintsYetMsg')} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('dashboard.tableId')}</TableHead>
          <TableHead>{t('dashboard.tableCategory')}</TableHead>
          <TableHead>{t('dashboard.tableLocation')}</TableHead>
          <TableHead>{t('dashboard.tableStatus')}</TableHead>
          <TableHead>{t('dashboard.tablePriority')}</TableHead>
          <TableHead>{t('dashboard.tableReported')}</TableHead>
          <TableHead>{t('dashboard.tableSla')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {complaints.map((c) => {
          const slaState: SlaState = computeSlaState(c.sla_deadline, c.status);
          return (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-xs">
                <Link to={`/complaints/${c.id}`} className="text-primary hover:underline">
                  {c.complaint_number}
                </Link>
              </TableCell>
              <TableCell className="text-sm">{c.categories?.name ?? '—'}</TableCell>
              <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                {c.address ?? '—'}
              </TableCell>
              <TableCell>
                <StatusBadge status={c.status} />
              </TableCell>
              <TableCell>
                <SeverityBadge severity={c.severity} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {timeAgo(c.created_at, t)}
              </TableCell>
              <TableCell>
                <SlaBadge state={slaState} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
