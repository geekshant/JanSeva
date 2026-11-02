import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import {
  Target,
  Trophy,
  Award,
  Users,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  useBadges,
  useRewardRules,
  useLevels,
  useLeaderboard,
} from '@/hooks/useGamification';
import { useAnalyticsSummary } from '@/hooks/useAnalytics';

export function CivicMissionsPage() {
  const { t } = useTranslation();
  const badgesQuery = useBadges();
  const rulesQuery = useRewardRules();
  const levelsQuery = useLevels();
  const leaderboardQuery = useLeaderboard('all_time', null);
  const summaryQuery = useAnalyticsSummary();

  return (
    <PageContainer
      title={t('gamificationAdmin.civicMissionsTitle')}
      description={t('gamificationAdmin.civicMissionsDesc')}
    >
      <div className="space-y-6">
        {/* Stats overview */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Users} label={t('gamificationAdmin.statActiveCitizens')} value={summaryQuery.data?.citizens} loading={summaryQuery.isLoading} />
          <StatCard icon={Award} label={t('gamificationAdmin.statBadges')} value={badgesQuery.data?.length} loading={badgesQuery.isLoading} />
          <StatCard icon={Target} label={t('gamificationAdmin.statRewardRules')} value={rulesQuery.data?.length} loading={rulesQuery.isLoading} />
          <StatCard icon={TrendingUp} label={t('gamificationAdmin.statResolutionRate')} value={summaryQuery.data ? `${summaryQuery.data.resolution_rate}%` : undefined} loading={summaryQuery.isLoading} />
        </div>

        {/* Top citizens */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4" />
              {t('gamificationAdmin.topCitizens')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboardQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : leaderboardQuery.data && leaderboardQuery.data.length > 0 ? (
              <div className="space-y-2">
                {leaderboardQuery.data.map((entry) => (
                  <Link
                    key={entry.user_id}
                    to={`/citizens/${entry.user_id}`}
                    className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {entry.rank}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.complaint_count} complaints · {entry.ward ?? '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Lv {entry.level}</Badge>
                      <span className="font-mono text-sm font-bold">{entry.points.toLocaleString('en-IN')}</span>
                    </div>
                  </Link>
                ))}
                <Link to="/gamification/leaderboard" className="block">
                  <Button variant="outline" size="sm" className="mt-2 w-full">
                    {t('gamificationAdmin.viewLeaderboard')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('gamificationAdmin.noLeaderboard')}</p>
            )}
          </CardContent>
        </Card>

        {/* Active reward rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              {t('gamificationAdmin.activeRewardRules')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rulesQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : rulesQuery.data && rulesQuery.data.length > 0 ? (
              <div className="space-y-2">
                {rulesQuery.data.filter((r) => r.active).map((rule) => (
                  <div key={rule.activity_type} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{rule.title}</p>
                      <p className="font-mono text-xs text-muted-foreground">{rule.activity_type}</p>
                    </div>
                    <Badge variant={rule.points >= 0 ? 'success' : 'destructive'} className="font-mono">
                      {rule.points >= 0 ? '+' : ''}{rule.points} pts
                    </Badge>
                  </div>
                ))}
                <Link to="/gamification/rewards" className="block">
                  <Button variant="ghost" size="sm" className="mt-2 w-full">
                    {t('gamificationAdmin.manageRules')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('gamificationAdmin.noRulesData')}</p>
            )}
          </CardContent>
        </Card>

        {/* Levels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              {t('gamificationAdmin.levelProgression')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {levelsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : levelsQuery.data && levelsQuery.data.length > 0 ? (
              <div className="space-y-1">
                {levelsQuery.data.map((lvl) => (
                  <div key={lvl.level} className="flex items-center gap-3 rounded-md border p-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {lvl.level}
                    </span>
                    <span className="flex-1 text-sm font-medium">{lvl.title}</span>
                    <span className="font-mono text-sm text-muted-foreground">{lvl.min_points.toLocaleString('en-IN')} pts</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('gamificationAdmin.noLevelsData')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function StatCard({ icon: Icon, label, value, loading }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number | undefined; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        {loading ? <Skeleton className="mt-2 h-7 w-16" /> : <p className="mt-1 text-2xl font-bold">{value ?? '—'}</p>}
      </CardContent>
    </Card>
  );
}
