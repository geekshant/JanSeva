import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import { Plus, Building2, MoreHorizontal, Power } from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
import { DepartmentDialog } from '@/components/departments/DepartmentDialog';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeactivateDepartment,
} from '@/hooks/useDepartments';
import { useDepartmentsRealtime } from '@/hooks/useRealtime';
import type { DepartmentInsert, DepartmentUpdate, DepartmentRow } from '@/types';

export function DepartmentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const departmentsQuery = useDepartments();
  useDepartmentsRealtime();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deactivateMutation = useDeactivateDepartment();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DepartmentRow | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<DepartmentRow | null>(null);

  const filtered = (departmentsQuery.data ?? []).filter((d) => {
    // Status filter
    if (statusFilter === 'active' && !d.active) return false;
    if (statusFilter === 'inactive' && d.active) return false;

    // Text search: matches name, code, service area, or mapped categories
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      (d.service_area ?? '').toLowerCase().includes(q) ||
      d.category_mappings.some((c) => c.toLowerCase().includes(q))
    );
  });

  const handleCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const handleEdit = (dept: DepartmentRow) => {
    setEditTarget(dept);
    setDialogOpen(true);
  };

  const handleConfirm = async (input: DepartmentInsert | DepartmentUpdate) => {
    if (editTarget) {
      await updateMutation.mutateAsync({ id: editTarget.id, patch: input as DepartmentUpdate });
    } else {
      await createMutation.mutateAsync(input as DepartmentInsert);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    await deactivateMutation.mutateAsync(deactivateTarget.id);
    setDeactivateTarget(null);
  };

  return (
    <PageContainer
      title={t('departments.title')}
      description={t('departments.desc')}
      actions={
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          {t('departments.new')}
        </Button>
      }
    >
      {/* Search + Status filter */}
      <div className="mb-4 flex items-center gap-2">
        <Input
          placeholder={t('departments.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="w-40"
        >
          <option value="all">{t('departments.filterAll')}</option>
          <option value="active">{t('departments.active')}</option>
          <option value="inactive">{t('departments.inactive')}</option>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          {departmentsQuery.isLoading ? (
            <LoadingState message={t('departments.loading')} />
          ) : departmentsQuery.error ? (
            <ErrorState
              title={t('departments.couldNotLoad')}
              message={departmentsQuery.error instanceof Error ? departmentsQuery.error.message : undefined}
              onRetry={() => void departmentsQuery.refetch()}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={t('departments.empty')}
              description={t('departments.emptyMsg')}
              actionLabel={t('departments.new')}
              onAction={handleCreate}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('departments.tableName')}</TableHead>
                  <TableHead>{t('departments.tableCode')}</TableHead>
                  <TableHead>{t('departments.tableServiceArea')}</TableHead>
                  <TableHead>{t('departments.tableCategories')}</TableHead>
                  <TableHead>{t('departments.tableStatus')}</TableHead>
                  <TableHead className="text-right">{t('departments.tableActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((dept) => (
                  <TableRow
                    key={dept.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/departments/${dept.id}`)}
                  >
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{dept.code}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {dept.service_area ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {dept.category_mappings.length > 0
                        ? t('departments.categoryCount', { count: dept.category_mappings.length })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={dept.active ? 'success' : 'secondary'}>
                        {dept.active ? t('departments.active') : t('departments.inactive')}
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
                            <DropdownMenuItem onClick={() => navigate(`/departments/${dept.id}`)}>
                             {t('departments.viewDetails')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(dept)}>
                             {t('departments.edit')}
                            </DropdownMenuItem>
                            {dept.active && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeactivateTarget(dept)}
                              >
                                <Power className="h-4 w-4" />
                                {t('departments.deactivate')}
                              </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DepartmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        department={editTarget}
        onConfirm={handleConfirm}
      />
      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={t('departments.deactivateTitle')}
        description={t('departments.deactivateConfirm', { name: deactivateTarget?.name ?? '' })}
        confirmLabel={t('departments.deactivateBtn')}
        variant="destructive"
        onConfirm={handleDeactivate}
      />
    </PageContainer>
  );
}
