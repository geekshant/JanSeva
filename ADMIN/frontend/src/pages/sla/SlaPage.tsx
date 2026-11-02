import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Timer,
  ShieldAlert,
  TrendingUp,
  CalendarClock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatCard } from '@/components/dashboard/StatCard';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { SlaBadge } from '@/components/common/SlaBadge';
import { SlaCountdown } from '@/components/sla/SlaCountdown';
import { useSlaOverview, useBreachedComplaints, useAtRiskComplaints, useDueSoonComplaints } from '@/hooks/useSla';
import { useSlaRealtime } from '@/hooks/useRealtime';
import type { ComplaintRow, ComplaintSeverity, SlaState } from '@/types';
import { computeSlaState } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function SlaPage() {
  const { t } = useTranslation();
  const overviewQuery = useSlaOverview();
  const breachedQuery = useBreachedComplaints();
  const atRiskQuery = useAtRiskComplaints();
  const dueSoonQuery = useDueSoonComplaints();

  // Realtime: invalidate SLA queries when complaints change (deadlines, status).
  useSlaRealtime();

  if (overviewQuery.isLoading) {
    return (
      <PageContainer title={t('sla.title')} description={t('sla.desc')}>
        <LoadingState message={t('sla.loading')} />
      </PageContainer>
    );
  }

  if (overviewQuery.error) {
    return (
      <PageContainer title={t('sla.title')}>
        <ErrorState
          title={t('sla.couldNotLoad')}
          message={overviewQuery.error instanceof Error ? overviewQuery.error.message : undefined}
          onRetry={() => void overviewQuery.refetch()}
        />
      </PageContainer>
    );
  }

  const overview = overviewQuery.data;

  return (
    <PageContainer
      title={t('sla.title')}
      description={t('sla.desc')}
      actions={
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/sla/rules">{t('sla.rulesBtn')}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/sla/breached">{t('sla.breachedBtn')}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/sla/escalations">{t('sla.escalationsBtn')}</Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard label={t('sla.onTrack')} value={overview?.on_track ?? 0} icon={CheckCircle2} />
          <StatCard label={t('sla.dueSoon')} value={overview?.due_soon ?? 0} icon={Clock} />
          <StatCard label={t('sla.atRisk')} value={overview?.at_risk ?? 0} icon={AlertTriangle} />
          <StatCard label={t('sla.breached')} value={overview?.breached ?? 0} icon={Timer} />
          <StatCard label={t('sla.escalated')} value={overview?.escalated ?? 0} icon={ShieldAlert} />
          <StatCard label={t('sla.resolved')} value={overview?.resolved ?? 0} icon={TrendingUp} />
        </div>

        {/* SLA Flow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              {t('sla.lifecycle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <SlaBadge state="ON_TRACK" />
              <span className="text-muted-foreground">→</span>
              <SlaBadge state="DUE_SOON" />
              <span className="text-muted-foreground">→</span>
              <SlaBadge state="AT_RISK" />
              <span className="text-muted-foreground">→</span>
              <SlaBadge state="BREACHED" />
              <span className="text-muted-foreground">→</span>
              <SlaBadge state="ESCALATED" />
              <span className="text-muted-foreground">→</span>
              <SlaBadge state="RESOLVED" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t('sla.helper')}
            </p>
          </CardContent>
        </Card>

        {/* At Risk + Due Soon Tables */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* At Risk */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('sla.atRiskTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {atRiskQuery.data && atRiskQuery.data.length > 0 ? (
                <SlaComplaintTable complaints={atRiskQuery.data} />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t('sla.noAtRisk')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Due Soon */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('sla.dueSoonTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dueSoonQuery.data && dueSoonQuery.data.length > 0 ? (
                <SlaComplaintTable complaints={dueSoonQuery.data} />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t('sla.noDueSoon')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Breached */}
        {breachedQuery.data && breachedQuery.data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Timer className="h-4 w-4 text-red-600" />
                {t('sla.breachedTitle', { count: breachedQuery.data.length })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SlaComplaintTable complaints={breachedQuery.data} />
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// SlaComplaintTable — shared table for SLA complaint lists
// ---------------------------------------------------------------------------

function SlaComplaintTable({ complaints }: { complaints: ComplaintRow[] }) {
  const { t } = useTranslation();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('sla.tableId')}</TableHead>
          <TableHead>{t('sla.tablePriority')}</TableHead>
          <TableHead>{t('sla.tableDeadline')}</TableHead>
          <TableHead>{t('sla.tableCountdown')}</TableHead>
          <TableHead>{t('dashboard.tableSla')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {complaints.map((c) => {
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
              <TableCell className="text-sm">{c.severity}</TableCell>
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
              <TableCell>
                <SlaBadge state={state} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
