import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import { Search, ShieldBan, ShieldCheck, MoreHorizontal, UserCheck } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProfiles, useSuspendCitizen, useRestoreCitizen } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { canSuspendCitizen, canRestoreCitizen } from '@/lib/workflow';
import { SuspendDialog } from '@/components/citizens/SuspendDialog';
import type { ProfileRow } from '@/types';

const PAGE_LIMIT = 20;

export function CitizensPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [suspendTarget, setSuspendTarget] = useState<ProfileRow | null>(null);

  const profilesQuery = useProfiles({
    page,
    limit: PAGE_LIMIT,
    search: search || undefined,
  });

  const suspendMutation = useSuspendCitizen();
  const restoreMutation = useRestoreCitizen();

  const adminRole = role ?? 'OFFICER';
  const canSuspend = canSuspendCitizen(adminRole);
  const canRestore = canRestoreCitizen(adminRole);

  const handleSuspendConfirm = useCallback(
    async (reason: string) => {
      if (!suspendTarget) return;
      await suspendMutation.mutateAsync({
        id: suspendTarget.id,
        reason,
        suspendedBy: user?.id ?? null,
      });
      setSuspendTarget(null);
    },
    [suspendTarget, suspendMutation, user],
  );

  const handleRestore = useCallback(
    async (citizen: ProfileRow) => {
      await restoreMutation.mutateAsync({
        id: citizen.id,
        restoredBy: user?.id ?? null,
      });
    },
    [restoreMutation, user],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <PageContainer
      title={t('citizens.title')}
      description={t('citizens.desc')}
    >
      <div className="space-y-4">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('citizens.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="default">
            {t('citizens.searchBtn')}
          </Button>
        </form>

        {/* Table */}
        {profilesQuery.error ? (
          <ErrorState
            title={t('citizens.couldNotLoad')}
            message={profilesQuery.error instanceof Error ? profilesQuery.error.message : undefined}
            onRetry={() => void profilesQuery.refetch()}
          />
        ) : profilesQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : profilesQuery.data && profilesQuery.data.data.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('citizens.tableName')}</TableHead>
                    <TableHead>{t('citizens.tableLevel')}</TableHead>
                    <TableHead>{t('citizens.tablePoints')}</TableHead>
                    <TableHead>{t('citizens.tableStatus')}</TableHead>
                    <TableHead>{t('citizens.joined')}</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profilesQuery.data.data.map((citizen) => (
                    <TableRow
                      key={citizen.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/citizens/${citizen.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={citizen.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                              {getInitials(citizen.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{citizen.name}</div>
                            {citizen.email && (
                              <div className="text-xs text-muted-foreground">
                                {citizen.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Lv {citizen.level}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {citizen.points.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        {citizen.is_suspended ? (
                          <Badge variant="destructive">{t('citizens.suspended')}</Badge>
                        ) : (
                          <Badge variant="success">{t('citizens.active')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(citizen.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/citizens/${citizen.id}`)}>
                              {t('citizens.viewProfile')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {citizen.is_suspended && canRestore && (
                              <DropdownMenuItem
                                onClick={() => handleRestore(citizen)}
                                className="text-green-600"
                              >
                                <ShieldCheck className="h-4 w-4" />
                                {t('citizens.restore')}
                              </DropdownMenuItem>
                            )}
                            {!citizen.is_suspended && canSuspend && (
                              <DropdownMenuItem
                                onClick={() => setSuspendTarget(citizen)}
                                className="text-destructive"
                              >
                                <ShieldBan className="h-4 w-4" />
                                {t('citizens.suspend')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination
              page={page}
              totalPages={profilesQuery.data.totalPages}
              total={profilesQuery.data.total}
              limit={PAGE_LIMIT}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            icon={UserCheck}
            title={t('citizens.empty')}
            description={search ? t('citizens.emptySearchMsg') : t('citizens.emptyMsg')}
          />
        )}
      </div>

      {/* Suspend dialog */}
      <SuspendDialog
        open={suspendTarget !== null}
        onOpenChange={(open) => !open && setSuspendTarget(null)}
        citizenName={suspendTarget?.name ?? ''}
        onConfirm={handleSuspendConfirm}
        loading={suspendMutation.isPending}
      />
    </PageContainer>
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}
