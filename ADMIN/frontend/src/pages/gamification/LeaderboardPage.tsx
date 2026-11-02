import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import { Trophy, Medal, Crown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/common/ErrorState';
import { cn } from '@/lib/utils';
import {
  useLeaderboard,
  useLeaderboardWards,
} from '@/hooks/useGamification';
import type { LeaderboardScope } from '@/services/gamification';

export function LeaderboardPage() {
  const { t } = useTranslation();
  const [scope, setScope] = useState<LeaderboardScope>('all_time');
  const [ward, setWard] = useState<string>('');

  const leaderboardQuery = useLeaderboard(scope, ward || null);
  const wardsQuery = useLeaderboardWards();

  const entries = leaderboardQuery.data ?? [];

  return (
    <PageContainer
      title={t('gamificationAdmin.leaderboardTitle')}
      description={t('gamificationAdmin.leaderboardDesc')}
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">{t('gamificationAdmin.timeScope')}</Label>
            <Select
              value={scope}
              onChange={(e) => setScope(e.target.value as LeaderboardScope)}
            >
              <option value="all_time">{t('gamificationAdmin.allTime')}</option>
              <option value="monthly">{t('gamificationAdmin.thisMonth')}</option>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">{t('gamificationAdmin.wardArea')}</Label>
            <Select value={ward} onChange={(e) => setWard(e.target.value)}>
              <option value="">{t('gamificationAdmin.allWards')}</option>
              {wardsQuery.data?.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Leaderboard */}
        {leaderboardQuery.error ? (
          <ErrorState
            title={t('gamificationAdmin.couldLoadLeaderboard')}
            message={leaderboardQuery.error instanceof Error ? leaderboardQuery.error.message : undefined}
            onRetry={() => void leaderboardQuery.refetch()}
          />
        ) : leaderboardQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-3">
            {/* Top 3 podium */}
            {entries.length >= 3 && (
              <div className="grid grid-cols-3 gap-3">
                {entries.slice(0, 3).map((entry, i) => (
                  <PodiumCard key={entry.user_id} entry={entry} place={i + 1} />
                ))}
              </div>
            )}

            {/* Full table */}
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground">{t('gamificationAdmin.tableRank')}</th>
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground">{t('gamificationAdmin.tableCitizen')}</th>
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground">{t('gamificationAdmin.tableWard')}</th>
                    <th className="p-3 text-right text-xs font-semibold text-muted-foreground">{t('gamificationAdmin.tableComplaints')}</th>
                    <th className="p-3 text-right text-xs font-semibold text-muted-foreground">{t('gamificationAdmin.tableLevel')}</th>
                    <th className="p-3 text-right text-xs font-semibold text-muted-foreground">{t('gamificationAdmin.tablePoints')}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.user_id}
                      className="border-b transition-colors last:border-0 hover:bg-muted/50"
                    >
                      <td className="p-3">
                        <span className="flex items-center gap-1.5 font-mono text-sm font-bold">
                          {entry.rank <= 3 && <RankIcon rank={entry.rank} />}
                          {entry.rank}
                        </span>
                      </td>
                      <td className="p-3">
                        <Link
                          to={`/citizens/${entry.user_id}`}
                          className="flex items-center gap-2"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={entry.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                              {getInitials(entry.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium hover:underline">{entry.name}</span>
                        </Link>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {entry.ward ?? '—'}
                      </td>
                      <td className="p-3 text-right text-sm">{entry.complaint_count}</td>
                      <td className="p-3 text-right">
                        <Badge variant="secondary" className="text-xs">Lv {entry.level}</Badge>
                      </td>
                      <td className="p-3 text-right font-mono text-sm font-bold">
                        {entry.points.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">{t('gamificationAdmin.noCitizens')}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('gamificationAdmin.noCitizensMsg')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------

function PodiumCard({
  entry,
  place,
}: {
  entry: {
    rank: number;
    user_id: string;
    name: string;
    avatar_url: string | null;
    points: number;
    level: number;
  };
  place: number;
}) {
  const colors = [
    'border-amber-500/40 bg-amber-500/5', // 1st gold
    'border-slate-400/40 bg-slate-400/5', // 2nd silver
    'border-orange-700/40 bg-orange-700/5', // 3rd bronze
  ];
  const icons = [Crown, Medal, Medal];

  const Icon = icons[place - 1] ?? Medal;

  return (
    <Card className={cn('relative', colors[place - 1])}>
      <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
        <Icon
          className={cn(
            'h-6 w-6',
            place === 1 && 'text-amber-500',
            place === 2 && 'text-slate-400',
            place === 3 && 'text-orange-600',
          )}
        />
        <Avatar className="h-12 w-12">
          <AvatarImage src={entry.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {getInitials(entry.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <Link to={`/citizens/${entry.user_id}`} className="text-sm font-semibold hover:underline">
            {entry.name}
          </Link>
          <p className="font-mono text-lg font-bold">{entry.points.toLocaleString('en-IN')}</p>
          <Badge variant="secondary" className="mt-1 text-xs">Level {entry.level}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-3.5 w-3.5 text-amber-500" />;
  if (rank <= 3) return <Medal className="h-3.5 w-3.5 text-slate-400" />;
  return null;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}
