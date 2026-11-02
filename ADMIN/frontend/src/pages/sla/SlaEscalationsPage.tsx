import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { SlaBadge } from '@/components/common/SlaBadge';
import { SlaCountdown } from '@/components/sla/SlaCountdown';
import { StatusBadge, SeverityBadge } from '@/components/common/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEscalatedComplaints } from '@/hooks/useSla';
import type { ComplaintSeverity, SlaState } from '@/types';
import { computeSlaState } from '@/types';

export function SlaEscalationsPage() {
  const { t } = useTranslation();
  const escalatedQuery = useEscalatedComplaints();

  return (
    <PageContainer
      title={t('sla.escalationsTitle')}
      description={t('sla.escalationsDesc')}
    >
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/sla">
            <ArrowLeft className="h-4 w-4" />
            {t('sla.backToSla')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          {escalatedQuery.isLoading ? (
            <LoadingState message={t('sla.loadingEscalated')} />
          ) : !escalatedQuery.data || escalatedQuery.data.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title={t('sla.noEscalated')}
              description={t('sla.noEscalatedMsg')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sla.tableId')}</TableHead>
                  <TableHead>{t('sla.tableStatus')}</TableHead>
                  <TableHead>{t('sla.tablePriority')}</TableHead>
                  <TableHead>{t('sla.tableDeadline')}</TableHead>
                  <TableHead>{t('sla.tableCountdown')}</TableHead>
                  <TableHead>{t('sla.tableSlaState')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalatedQuery.data.map((c) => {
                  const state: SlaState = computeSlaState(
                    c.sla_deadline,
                    c.status,
                    c.severity as ComplaintSeverity,
                  );
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">
                        <Link to={`/complaints/${c.id}`} className="text-primary hover:underline">
                          {c.complaint_number}
                        </Link>
                      </TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell><SeverityBadge severity={c.severity} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.sla_deadline
                          ? new Date(c.sla_deadline).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <SlaCountdown deadline={c.sla_deadline} state={state} />
                      </TableCell>
                      <TableCell><SlaBadge state={state} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
