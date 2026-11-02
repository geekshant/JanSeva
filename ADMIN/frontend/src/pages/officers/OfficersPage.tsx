import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import { Plus, Users, MoreHorizontal, Power } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageContainer } from '@/components/layout/PageContainer';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { OfficerDialog } from '@/components/officers/OfficerDialog';
import { useOfficers, useCreateOfficer, useUpdateOfficer, useDeactivateOfficer } from '@/hooks/useOfficers';
import { useDepartments } from '@/hooks/useDepartments';
import { useOfficersRealtime } from '@/hooks/useRealtime';
import type { OfficerInsert, OfficerUpdate, OfficerWithRelations } from '@/types';

export function OfficersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const departmentsQuery = useDepartments();
  useOfficersRealtime();
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  const officersQuery = useOfficers({
    page,
    limit: 20,
    departmentId: departmentFilter || undefined,
    role: roleFilter || undefined,
  });

  const createMutation = useCreateOfficer();
  const updateMutation = useUpdateOfficer();
  const deactivateMutation = useDeactivateOfficer();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OfficerWithRelations | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<OfficerWithRelations | null>(null);

  const filtered = (officersQuery.data?.data ?? []).filter((o) => {
    if (!search) return true;
    const name = o.profiles?.name ?? '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleConfirm = async (input: OfficerInsert | OfficerUpdate) => {
    if (editTarget) {
      await updateMutation.mutateAsync({ id: editTarget.id, patch: input as OfficerUpdate });
    } else {
      await createMutation.mutateAsync(input as OfficerInsert);
    }
  };

  return (
    <PageContainer
      title={t('officers.title')}
      description={t('officers.desc')}
      actions={
        <Button
          onClick={() => { setEditTarget(null); setDialogOpen(true); }}
        >
          <Plus className="h-4 w-4" />
          {t('officers.new')}
        </Button>
      }
    >
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder={t('officers.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={departmentFilter}
          onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
          className="w-48"
        >
          <option value="">{t('officers.allDepartments')}</option>
          {departmentsQuery.data?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
        <Select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="w-40"
        >
          <option value="">{t('officers.allRoles')}</option>
          <option value="OFFICER">{t('officers.roleOfficer')}</option>
          <option value="DEPARTMENT_ADMIN">{t('officers.roleDeptAdmin')}</option>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          {officersQuery.isLoading ? (
            <LoadingState message={t('officers.loading')} />
          ) : officersQuery.error ? (
            <ErrorState
              title={t('officers.couldNotLoad')}
              message={officersQuery.error instanceof Error ? officersQuery.error.message : undefined}
              onRetry={() => void officersQuery.refetch()}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('officers.empty')}
              description={t('officers.emptyMsg')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('officers.tableOfficer')}</TableHead>
                  <TableHead>{t('officers.tableDepartment')}</TableHead>
                  <TableHead>{t('officers.tableRole')}</TableHead>
                  <TableHead>{t('officers.tableStatus')}</TableHead>
                  <TableHead className="text-right">{t('officers.tableActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((officer) => {
                  const initials = (officer.profiles?.name ?? '?')
                    .split(' ')
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  return (
                    <TableRow
                      key={officer.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/officers/${officer.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {officer.profiles?.name ?? 'Unknown'}
                            </p>
                            {officer.title && (
                              <p className="text-xs text-muted-foreground">{officer.title}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {officer.departments?.name ?? t('officers.unassigned')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={officer.role === 'DEPARTMENT_ADMIN' ? 'default' : 'secondary'}>
                          {officer.role === 'DEPARTMENT_ADMIN' ? t('officers.roleDeptAdmin') : t('officers.roleOfficer')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={officer.active ? 'success' : 'secondary'}>
                          {officer.active ? t('officers.active') : t('officers.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/officers/${officer.id}`)}>
                              {t('officers.viewDetails')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditTarget(officer); setDialogOpen(true); }}>
                              {t('officers.edit')}
                            </DropdownMenuItem>
                            {officer.active && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeactivateTarget(officer)}
                              >
                                <Power className="h-4 w-4" />
                                {t('officers.deactivate')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <OfficerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        officer={editTarget}
        departments={departmentsQuery.data ?? []}
        onConfirm={handleConfirm}
      />
      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={t('officers.deactivateTitle')}
        description={t('officers.deactivateConfirm', { name: deactivateTarget?.profiles?.name ?? '' })}
        confirmLabel={t('officers.deactivateBtn')}
        variant="destructive"
        onConfirm={async () => {
          if (deactivateTarget) {
            await deactivateMutation.mutateAsync(deactivateTarget.id);
            setDeactivateTarget(null);
          }
        }}
      />
    </PageContainer>
  );
}
