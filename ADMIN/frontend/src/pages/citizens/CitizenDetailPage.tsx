import { useParams, Link } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useTranslation } from '@/i18n/translate';
import {
  ArrowLeft,
  ShieldBan,
  ShieldCheck,
  Award,
  Trophy,
  FileText,
  Activity,
  Lock,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge, SeverityBadge } from '@/components/common/StatusBadge';
import { PageContainer } from '@/components/layout/PageContainer';
import { SuspendDialog } from '@/components/citizens/SuspendDialog';
import {
  useProfile,
  useCitizenStats,
  useCitizenBadges,
  useCitizenRewards,
  useCitizenComplaints,
  useSuspendCitizen,
  useRestoreCitizen,
} from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import {
  canSuspendCitizen,
  canRestoreCitizen,
  canViewCitizenContact,
} from '@/lib/workflow';
import type { AdminRole } from '@/lib/workflow';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CitizenDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();

  const profileQuery = useProfile(id ?? '');
  const statsQuery = useCitizenStats(id ?? '');
  const badgesQuery = useCitizenBadges(id ?? '');
  const rewardsQuery = useCitizenRewards(id ?? '');
  const complaintsQuery = useCitizenComplaints(id ?? '');

  const suspendMutation = useSuspendCitizen();
  const restoreMutation = useRestoreCitizen();

  const [showSuspendDialog, setShowSuspendDialog] = useState(false);

  const adminRole: AdminRole = role ?? 'OFFICER';
  const canSuspend = canSuspendCitizen(adminRole);
  const canRestore = canRestoreCitizen(adminRole);
  const canSeeContact = canViewCitizenContact(adminRole);

  const handleSuspendConfirm = useCallback(
    async (reason: string) => {
      if (!id) return;
      await suspendMutation.mutateAsync({
        id,
        reason,
        suspendedBy: user?.id ?? null,
      });
      setShowSuspendDialog(false);
    },
    [id, suspendMutation, user],
  );

  const handleRestore = useCallback(async () => {
    if (!id) return;
    await restoreMutation.mutateAsync({
      id,
      restoredBy: user?.id ?? null,
    });
  }, [id, restoreMutation, user]);

  // --- Loading state ---
  if (profileQuery.isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </PageContainer>
    );
  }

  // --- Error / not found ---
  if (profileQuery.error || !profileQuery.data) {
    return (
      <PageContainer>
        <ErrorState
          title={t('citizens.notFound')}
          message={t('citizens.notFoundMsg')}
        />
      </PageContainer>
    );
  }

  const profile = profileQuery.data;
  const stats = statsQuery.data;
  const badges = badgesQuery.data ?? [];
  const rewards = rewardsQuery.data ?? [];
  const complaints = complaintsQuery.data ?? [];

  return (
    <PageContainer>
      {/* Back link */}
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/citizens">
            <ArrowLeft className="h-4 w-4" />
            {t('citizens.back')}
          </Link>
        </Button>
      </div>

      {/* ===== Header ===== */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
              {getInitials(profile.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
              {profile.is_suspended ? (
                <Badge variant="destructive">{t('citizens.suspended')}</Badge>
              ) : (
                <Badge variant="success">{t('citizens.active')}</Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="font-mono">ID: {profile.id.slice(0, 8)}...</span>
              <Badge variant="secondary">{t('citizens.level')} {profile.level}</Badge>
              <span className="flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5" />
                {profile.points.toLocaleString('en-IN')} pts
              </span>
              <span>{t('citizens.joined')} {formatDate(profile.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {profile.is_suspended && canRestore && (
            <Button
              variant="default"
              onClick={handleRestore}
              disabled={restoreMutation.isPending}
            >
              <ShieldCheck className="h-4 w-4" />
              {t('citizens.restore')}
            </Button>
          )}
          {!profile.is_suspended && canSuspend && (
            <Button
              variant="destructive"
              onClick={() => setShowSuspendDialog(true)}
              disabled={suspendMutation.isPending}
            >
              <ShieldBan className="h-4 w-4" />
              {t('citizens.suspend')}
            </Button>
          )}
        </div>
      </div>

      {/* Suspension notice */}
      {profile.is_suspended && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 py-4">
            <ShieldBan className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-destructive">
                {t('citizens.suspendedNotice')}
              </p>
              {profile.suspension_reason && (
                <p className="text-sm text-muted-foreground">
                  {t('citizens.suspendReason', { reason: profile.suspension_reason })}
                </p>
              )}
              {profile.suspended_at && (
                <p className="text-xs text-muted-foreground">
                  {t('citizens.suspendedOn', { date: formatDate(profile.suspended_at) })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gamification values are READ-ONLY notice */}
      {!canSeeContact && (
        <Card className="mb-6 bg-muted/50">
          <CardContent className="flex items-start gap-3 py-3">
            <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {t('citizens.restricted')}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ===== Main content — left 2/3 ===== */}
        <div className="space-y-6 lg:col-span-2">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              icon={FileText}
              label={t('citizens.statTotalReports')}
              value={stats?.total_complaints}
              loading={statsQuery.isLoading}
            />
            <StatCard
              icon={CheckCircle2}
              label={t('citizens.statVerified')}
              value={stats?.verified_reports}
              loading={statsQuery.isLoading}
              color="text-blue-600"
            />
            <StatCard
              icon={TrendingUp}
              label={t('citizens.statResolved')}
              value={stats?.resolved_reports}
              loading={statsQuery.isLoading}
              color="text-green-600"
            />
            <StatCard
              icon={XCircle}
              label={t('citizens.statRejected')}
              value={stats?.rejected_reports}
              loading={statsQuery.isLoading}
              color="text-red-600"
            />
          </div>

          {/* Recent complaints */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                {t('citizens.recentComplaints')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {complaintsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : complaints.length > 0 ? (
                <div className="space-y-2">
                  {complaints.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {c.complaint_number}
                          </span>
                          <StatusBadge status={c.status} />
                          <SeverityBadge severity={c.severity} />
                        </div>
                        <p className="mt-1 truncate text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(c.created_at)}
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="sm" className="shrink-0">
                        <Link to={`/complaints/${c.id}`}>{t('citizens.view')}</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t('citizens.noComplaints')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Participation history (rewards) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                {t('citizens.participationHistory')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rewardsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : rewards.length > 0 ? (
                <div className="relative space-y-4">
                  <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
                  {rewards.map((r) => (
                    <div key={r.id} className="relative flex items-start gap-3">
                      <div className="z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-card">
                        <Trophy className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {formatActivityType(r.activity_type)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            +{r.points} pts
                          </Badge>
                        </div>
                        {r.description && (
                          <p className="text-xs text-muted-foreground">{r.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(r.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t('citizens.noParticipation')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ===== Sidebar — right 1/3 ===== */}
        <div className="space-y-6">
          {/* Contact info (role-gated) */}
          {canSeeContact && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('citizens.contactInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {profile.email && (
                  <div>
                    <span className="text-muted-foreground">{t('citizens.email')}</span>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                )}
                {profile.phone && (
                  <div>
                    <span className="text-muted-foreground">{t('citizens.phone')}</span>
                    <p className="font-medium">{profile.phone}</p>
                  </div>
                )}
                {!profile.email && !profile.phone && (
                  <p className="text-sm text-muted-foreground">
                    {t('citizens.noContact')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4" />
                {t('citizens.badges', { count: badges.length })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {badgesQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : badges.length > 0 ? (
                <div className="space-y-2">
                  {badges.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 rounded-md border p-2.5"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <Award className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {b.badges?.name ?? t('citizens.unknownBadge')}
                        </p>
                        {b.badges?.description && (
                          <p className="truncate text-xs text-muted-foreground">
                            {b.badges.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(b.earned_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t('citizens.noBadges')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Gamification summary (READ-ONLY) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4" />
                {t('citizens.gamification')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5" />
                  {t('citizens.totalPoints')}
                </span>
                <span className="font-mono font-medium">
                  {profile.points.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {t('citizens.level')}
                </span>
                <Badge variant="secondary">{profile.level}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Award className="h-3.5 w-3.5" />
                  {t('citizens.badgesCount')}
                </span>
                <span className="font-medium">{stats?.badge_count ?? 0}</span>
              </div>
              <Separator />
              <div className="flex items-start gap-1.5 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  {t('citizens.gamificationNotice')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Suspend dialog */}
      <SuspendDialog
        open={showSuspendDialog}
        onOpenChange={setShowSuspendDialog}
        citizenName={profile.name}
        onConfirm={handleSuspendConfirm}
        loading={suspendMutation.isPending}
      />
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

function formatActivityType(type: string): string {
  return type
    .toLowerCase()
    .split('_')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// StatCard — small stat card for the citizen stats grid
// ---------------------------------------------------------------------------
function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  loading: boolean;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${color ?? 'text-muted-foreground'}`} />
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-16" />
        ) : (
          <p className="mt-1 text-2xl font-bold">{value ?? 0}</p>
        )}
      </CardContent>
    </Card>
  );
}
