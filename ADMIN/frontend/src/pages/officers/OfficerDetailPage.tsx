import { useParams, Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Timer,
  Mail,
  Phone,
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
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ErrorState } from '@/components/common/ErrorState';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatusBadge, SeverityBadge } from '@/components/common/StatusBadge';
import { useOfficer, useOfficerStats, useOfficerComplaints } from '@/hooks/useOfficers';
import { useAuth } from '@/hooks/useAuth';
import { canViewCitizenContact } from '@/lib/workflow';
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

export function OfficerDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const officerQuery = useOfficer(id ?? '');
  const statsQuery = useOfficerStats(id ?? '');
  const complaintsQuery = useOfficerComplaints(id ?? '', 10);

  if (officerQuery.isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-32" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (officerQuery.error || !officerQuery.data) {
    return (
      <PageContainer>
        <ErrorState title={t('officers.notFound')} />
      </PageContainer>
    );
  }

  const officer = officerQuery.data;
  const stats = statsQuery.data;
  const showContact = canViewCitizenContact(role ?? 'OFFICER');
  const initials = (officer.profiles?.name ?? '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <PageContainer>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/officers">
            <ArrowLeft className="h-4 w-4" />
            {t('officers.back')}
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {officer.profiles?.name ?? t('officers.unknownOfficer')}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={officer.role === 'DEPARTMENT_ADMIN' ? 'default' : 'secondary'}>
              {officer.role === 'DEPARTMENT_ADMIN' ? t('officers.roleDeptAdmin') : t('officers.roleOfficer')}
            </Badge>
            {officer.title && (
              <Badge variant="outline">{officer.title}</Badge>
            )}
            <Badge variant={officer.active ? 'success' : 'secondary'}>
              {officer.active ? t('officers.active') : t('officers.inactive')}
            </Badge>
          </div>
          {officer.departments && (
            <p className="mt-2 text-sm text-muted-foreground">
              Department:{' '}
              <Link to={`/departments/${officer.departments.id}`} className="font-medium text-primary hover:underline">
                {officer.departments.name}
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('officers.statAssigned')}
          value={stats?.assigned_complaints ?? '—'}
          icon={AlertTriangle}
        />
        <StatCard
          label={t('officers.statCompleted')}
          value={stats?.completed_complaints ?? '—'}
          icon={CheckCircle2}
        />
        <StatCard
          label={t('officers.statSlaBreaches')}
          value={stats?.sla_breaches ?? '—'}
          icon={Clock}
        />
        <StatCard
          label={t('officers.statAvgResolution')}
          value={stats?.avg_resolution_hours !== null && stats?.avg_resolution_hours !== undefined ? `${stats.avg_resolution_hours}h` : '—'}
          icon={Timer}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Assigned Complaints */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('officers.assignedComplaints')}</CardTitle>
            </CardHeader>
            <CardContent>
              {complaintsQuery.isLoading ? (
                <Skeleton className="h-48" />
              ) : complaintsQuery.data && complaintsQuery.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('dashboard.tableId')}</TableHead>
                      <TableHead>{t('dashboard.tableTitle')}</TableHead>
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
                        <TableCell className="max-w-[180px] truncate text-sm font-medium">
                          {c.title}
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
                  {t('officers.noComplaints')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contact Info */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('officers.contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {showContact ? (
                <>
                  {officer.profiles?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{officer.profiles.email}</span>
                    </div>
                  )}
                  {officer.profiles?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{officer.profiles.phone}</span>
                    </div>
                  )}
                  {!officer.profiles?.email && !officer.profiles?.phone && (
                    <p className="text-muted-foreground">{t('officers.noContact')}</p>
                  )}
                  <Separator />
                  <div>
                    <span className="text-muted-foreground">{t('officers.memberSince')}</span>
                    <span className="font-medium">
                      {formatDate(officer.created_at)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('officers.restricted')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
