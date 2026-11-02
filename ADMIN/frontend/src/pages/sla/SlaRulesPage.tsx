import { useState } from 'react';
import { useTranslation } from '@/i18n/translate';
import { Plus, Clock, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { SlaRuleDialog } from '@/components/sla/SlaRuleDialog';
import {
  useSlaRules,
  useCreateSlaRule,
  useUpdateSlaRule,
  useDeleteSlaRule,
} from '@/hooks/useSla';
import { useCategories } from '@/hooks/useCategories';
import { useDepartments } from '@/hooks/useDepartments';
import type { SlaRuleInsert, SlaRuleUpdate, SlaRuleRow } from '@/types';

export function SlaRulesPage() {
  const { t } = useTranslation();
  const rulesQuery = useSlaRules();
  const categoriesQuery = useCategories();
  const departmentsQuery = useDepartments();
  const createMutation = useCreateSlaRule();
  const updateMutation = useUpdateSlaRule();
  const deleteMutation = useDeleteSlaRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SlaRuleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SlaRuleRow | null>(null);

  const handleConfirm = async (input: SlaRuleInsert | SlaRuleUpdate) => {
    if (editTarget) {
      await updateMutation.mutateAsync({ id: editTarget.id, patch: input as SlaRuleUpdate });
    } else {
      await createMutation.mutateAsync(input as SlaRuleInsert);
    }
  };

  const categories = categoriesQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];

  return (
    <PageContainer
      title={t('sla.rulesTitle')}
      description={t('sla.rulesDesc')}
      actions={
        <Button
          onClick={() => { setEditTarget(null); setDialogOpen(true); }}
        >
          <Plus className="h-4 w-4" />
          {t('sla.newRule')}
        </Button>
      }
    >
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          {rulesQuery.isLoading ? (
            <LoadingState message={t('sla.loadingRules')} />
          ) : rulesQuery.error ? (
            <ErrorState
              title={t('sla.couldLoadRules')}
              message={rulesQuery.error instanceof Error ? rulesQuery.error.message : undefined}
              onRetry={() => void rulesQuery.refetch()}
            />
          ) : !rulesQuery.data || rulesQuery.data.length === 0 ? (
            <EmptyState
              icon={Clock}
              title={t('sla.noRules')}
              description={t('sla.noRulesMsg')}
              actionLabel={t('sla.newRule')}
              onAction={() => { setEditTarget(null); setDialogOpen(true); }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sla.tableCategory')}</TableHead>
                  <TableHead>{t('sla.tableDepartment')}</TableHead>
                  <TableHead>{t('sla.tableSeverity')}</TableHead>
                  <TableHead>{t('sla.tableDeadline')}</TableHead>
                  <TableHead>{t('sla.tableWarning')}</TableHead>
                  <TableHead>{t('sla.tableCritical')}</TableHead>
                  <TableHead>{t('sla.tableStatus')}</TableHead>
                  <TableHead className="text-right">{t('dashboard.tableActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rulesQuery.data.map((rule) => {
                  const cat = categories.find((c) => c.id === rule.category_id);
                  const dept = departments.find((d) => d.id === rule.department_id);
                  return (
                    <TableRow key={rule.id}>
                      <TableCell className="text-sm">
                        {cat?.name ?? t('sla.allCategories')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {dept?.name ?? t('sla.allDepartments')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.severity}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{rule.deadline_hours}h</TableCell>
                      <TableCell className="text-sm">{rule.warning_hours}h</TableCell>
                      <TableCell className="text-sm">{rule.critical_hours}h</TableCell>
                      <TableCell>
                        <Badge variant={rule.active ? 'success' : 'secondary'}>
                          {rule.active ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => { setEditTarget(rule); setDialogOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTarget(rule)}
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('common.delete')}
                            </DropdownMenuItem>
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

      <SlaRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={editTarget}
        categories={categories}
        departments={departments}
        onConfirm={handleConfirm}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('sla.deleteTitle')}
        description={t('sla.deleteConfirm')}
        confirmLabel={t('sla.deleteBtn')}
        variant="destructive"
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMutation.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </PageContainer>
  );
}
