import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import {
  Trophy,
  Award,
  Target,
  BarChart3,
  TrendingUp,
  Gift,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  useBadges,
  useRewardRules,
  useLevels,
  useRewards,
} from '@/hooks/useGamification';

export function GamificationPage() {
  const { t } = useTranslation();
  const badgesQuery = useBadges();
  const rulesQuery = useRewardRules();
  const levelsQuery = useLevels();
  const rewardsQuery = useRewards({ page: 1, limit: 1 });

  const activeBadges = (badgesQuery.data ?? []).filter((b) => b.active);
  const activeRules = (rulesQuery.data ?? []).filter((r) => r.active);

  return (
    <PageContainer
      title={t('gamificationAdmin.title')}
      description={t('gamificationAdmin.desc')}
    >
      <div className="space-y-6">
        {/* Overview stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <OverviewCard
            icon={Award}
            label={t('gamificationAdmin.badges')}
            value={badgesQuery.isLoading ? undefined : badgesQuery.data?.length ?? 0}
            sub={t('gamificationAdmin.badgesActive', { count: activeBadges.length })}
            loading={badgesQuery.isLoading}
          />
          <OverviewCard
            icon={Target}
            label={t('gamificationAdmin.rewardRules')}
            value={rulesQuery.isLoading ? undefined : rulesQuery.data?.length ?? 0}
            sub={t('gamificationAdmin.rulesActive', { count: activeRules.length })}
            loading={rulesQuery.isLoading}
          />
          <OverviewCard
            icon={TrendingUp}
            label={t('gamificationAdmin.levels')}
            value={levelsQuery.isLoading ? undefined : levelsQuery.data?.length ?? 0}
            sub={t('gamificationAdmin.configured')}
            loading={levelsQuery.isLoading}
          />
          <OverviewCard
            icon={Gift}
            label={t('gamificationAdmin.pointsAwarded')}
            value={rewardsQuery.isLoading ? undefined : rewardsQuery.data?.total ?? 0}
            sub={t('gamificationAdmin.totalTransactions')}
            loading={rewardsQuery.isLoading}
          />
        </div>

        {/* Quick links */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            to="/gamification/badges"
            icon={Award}
            title={t('gamificationAdmin.badgesLink')}
            description={t('gamificationAdmin.badgesDesc')}
          />
          <QuickLink
            to="/gamification/rewards"
            icon={Target}
            title={t('gamificationAdmin.rulesLink')}
            description={t('gamificationAdmin.rulesDesc')}
          />
          <QuickLink
            to="/gamification/leaderboard"
            icon={BarChart3}
            title={t('gamificationAdmin.leaderboardLink')}
            description={t('gamificationAdmin.leaderboardDesc')}
          />
        </div>

        {/* Level configuration preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4" />
              {t('gamificationAdmin.levelConfig')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {levelsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : levelsQuery.data && levelsQuery.data.length > 0 ? (
              <div className="space-y-2">
                {levelsQuery.data.map((lvl) => (
                  <div
                    key={lvl.level}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {lvl.level}
                      </div>
                      <span className="text-sm font-medium">{lvl.title}</span>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {lvl.min_points.toLocaleString('en-IN')} pts
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t('gamificationAdmin.noLevels')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Security notice */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4">
            <Lock className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold">{t('gamificationAdmin.pointsManagedTitle')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('gamificationAdmin.pointsManagedDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  sub: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-16" />
        ) : (
          <p className="mt-1 text-2xl font-bold">{value ?? 0}</p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link to={to}>
      <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/30">
        <CardContent className="flex items-start gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
