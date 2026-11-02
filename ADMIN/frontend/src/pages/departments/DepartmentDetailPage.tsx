import { useParams, Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import {
  ArrowLeft,
  Building2,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Timer,
  Tag,
  Gauge,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  useDepartment,
  useDepartmentStats,
  useDepartmentComplaints,
  useDepartmentSlaRules,
} from '@/hooks/useDepartments';
import { useOfficers } from '@/hooks/useOfficers';
import { StatusBadge, SeverityBadge } from '@/components/common/StatusBadge';
import type { ComplaintSeverity } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatHours(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

export function DepartmentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const deptQuery = useDepartment(id ?? '');
  const statsQuery = useDepartmentStats(id ?? '');
  const complaintsQuery = useDepartmentComplaints(id ?? '', 10);
  const officersQuery = useOfficers({ departmentId: id, limit: 100 });
  const slaQuery = useDepartmentSlaRules(id ?? '');

  if (deptQuery.isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-32" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (deptQuery.error || !deptQuery.data) {
    return (
      <PageContainer>
        <ErrorState title={t('departments.notFound')} />
      </PageContainer>
    );
  }

  const dept = deptQuery.data;
  const stats = statsQuery.data;
  const slaRules = slaQuery.data ?? [];
  const sortedSla = [...slaRules].sort((a, b) => {
    const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
  });

  return (
    <PageContainer>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/departments">
            <ArrowLeft className="h-4 w-4" />
            {t('departments.back')}
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-3">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{dept.name}</h1>
              <Badge variant="outline" className="mt-1 font-mono">{dept.code}</Badge>
            </div>
          </div>
          {dept.service_area && (
            <p className="mt-2 max-w-2xl text-sm font-medium text-foreground">
              {dept.service_area}
            </p>
          )}
          {dept.description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {dept.description}
            </p>
          )}
        </div>
        <Badge variant={dept.active ? 'success' : 'secondary'}>
          {dept.active ? t('departments.active') : t('departments.inactive')}
        </Badge>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label={t('departments.statActive')}
          value={stats?.active_complaints ?? '—'}
          icon={AlertTriangle}
        />
        <StatCard
          label={t('departments.statResolved')}
          value={stats?.resolved_complaints ?? '—'}
          icon={CheckCircle2}
        />
        <StatCard
          label={t('departments.statSlaBreaches')}
          value={stats?.sla_breaches ?? '—'}
          icon={Clock}
        />
        <StatCard
          label={t('departments.statAvgResolution')}
          value={stats?.avg_resolution_hours !== null && stats?.avg_resolution_hours !== undefined ? `${stats.avg_resolution_hours}h` : '—'}
          icon={Timer}
        />
        <StatCard
          label={t('departments.statOfficers')}
          value={stats?.officer_count ?? '—'}
          icon={Users}
        />
      </div>

      {/* Category Mappings + SLA */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Category Mappings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4 text-primary" />
              {t('departments.categoryMappings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dept.category_mappings.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {dept.category_mappings.map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-xs">
                    {cat}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('departments.noCategories')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* SLA Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4 text-primary" />
              {t('departments.slaConfig')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedSla.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('departments.slaSeverity')}</TableHead>
                    <TableHead>{t('departments.slaDeadline')}</TableHead>
                    <TableHead>{t('departments.slaWarning')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSla.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell><SeverityBadge severity={rule.severity as ComplaintSeverity} /></TableCell>
                      <TableCell className="font-medium">{formatHours(rule.deadline_hours)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatHours(rule.warning_hours)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('departments.noSlaRules')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Complaints */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('departments.recentComplaints')}</CardTitle>
          </CardHeader>
          <CardContent>
            {complaintsQuery.isLoading ? (
              <Skeleton className="h-48" />
            ) : complaintsQuery.data && complaintsQuery.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('dashboard.tableId')}</TableHead>
                    <TableHead>{t('dashboard.tableStatus')}</TableHead>
                    <TableHead>{t('dashboard.tablePriority')}</TableHead>
                    <TableHead>{t('dashboard.tableDate')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaintsQuery.data.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">
                        <Link to={`/complaints/${c.id}`} className="text-primary hover:underline">
                          {c.complaint_number}
                        </Link>
                      </TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell><SeverityBadge severity={c.severity} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(c.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('departments.noComplaints')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Officers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('departments.officers')}</CardTitle>
          </CardHeader>
          <CardContent>
            {officersQuery.isLoading ? (
              <Skeleton className="h-48" />
            ) : officersQuery.data && officersQuery.data.data.length > 0 ? (
              <div className="space-y-2">
                {officersQuery.data.data.map((officer) => (
                  <Link
                    key={officer.id}
                    to={`/officers/${officer.id}`}
                    className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {officer.profiles?.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {officer.role === 'DEPARTMENT_ADMIN' ? t('departments.roleDeptAdmin') : t('departments.roleOfficer')}
                        {officer.title ? ` · ${officer.title}` : ''}
                      </p>
                    </div>
                    <Badge variant={officer.active ? 'success' : 'secondary'}>
                      {officer.active ? t('departments.active') : t('departments.inactive')}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('departments.noOfficers')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
