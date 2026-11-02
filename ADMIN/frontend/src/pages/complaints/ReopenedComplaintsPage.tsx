import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge, SeverityBadge } from '@/components/common/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useReopenedComplaints } from '@/hooks/useVerification';
import type { ComplaintStatus, ReopenedComplaintItem } from '@/types';

function formatTimeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Maps the `reopened_by` UUID to a label. Since reopening is restricted to
 * admins/officers (via the `reopen_complaint` RPC's `is_admin()` guard),
 * the reopener is always staff. Legacy rows backfilled from history may
 * have a NULL `reopened_by` (system/citizen reopen) — we show "System" then.
 */
function getReopenerLabel(item: ReopenedComplaintItem, t: (k: string) => string): string {
  if (item.reopener_name) return item.reopener_name;
  if (!item.reopened_by) return t('complaints.reopenedBySystem');
  return t('complaints.reopenedByAdmin');
}

export function ReopenedComplaintsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // 200 rows — the partial index on reopened_at keeps this fast.
  const reopenedQuery = useReopenedComplaints(200, 0);

  return (
    <PageContainer
      title={t('complaints.reopenedTitle')}
      description={t('complaints.reopenedDesc')}
    >
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {reopenedQuery.error ? (
              <ErrorState
                title={t('complaints.reopenedCouldNotLoad')}
                message={
                  reopenedQuery.error instanceof Error
                    ? reopenedQuery.error.message
                    : t('complaints.reopenedCouldNotLoadMsg')
                }
                onRetry={() => void reopenedQuery.refetch()}
              />
            ) : reopenedQuery.isLoading ? (
              <LoadingState message={t('common.loading')} />
            ) : !reopenedQuery.data || reopenedQuery.data.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title={t('complaints.reopenedEmpty')}
                description={t('complaints.reopenedEmptyMsg')}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('complaints.reopenedTableId')}</TableHead>
                    <TableHead>{t('complaints.reopenedTableCategory')}</TableHead>
                    <TableHead>{t('complaints.reopenedTableTitle')}</TableHead>
                    <TableHead>{t('complaints.reopenedTablePreviousResolution')}</TableHead>
                    <TableHead>{t('complaints.reopenedTableCurrentStatus')}</TableHead>
                    <TableHead>{t('complaints.reopenedTableReopenedBy')}</TableHead>
                    <TableHead>{t('complaints.reopenedTableReason')}</TableHead>
                    <TableHead>{t('complaints.reopenedTablePriority')}</TableHead>
                    <TableHead>{t('complaints.reopenedTableReopenedAt')}</TableHead>
                    <TableHead className="text-right">
                      {t('complaints.reopenedTableActions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reopenedQuery.data.map((item: ReopenedComplaintItem) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => navigate(`/complaints/${item.id}`)}
                    >
                      <TableCell className="font-mono text-xs">
                        {item.complaint_number}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.category_name ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm font-medium">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        {item.previous_resolution ? (
                          <Badge variant="secondary">
                            {item.previous_resolution}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t('complaints.reopenedNeverResolved')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status as ComplaintStatus} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getReopenerLabel(item, t)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {item.reopen_reason ?? '—'}
                      </TableCell>
                      <TableCell>
                        <SeverityBadge severity={item.severity} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatTimeAgo(item.reopened_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/complaints/${item.id}`);
                          }}
                        >
                          {t('complaints.reopenedViewCase')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
