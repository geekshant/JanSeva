import { useState, useCallback } from 'react';
import { useTranslation } from '@/i18n/translate';
import { Plus, MoreHorizontal, Pencil, Power } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageContainer } from '@/components/layout/PageContainer';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useRewardRules, useCreateRewardRule, useUpdateRewardRule } from '@/hooks/useGamification';
import type { RewardRuleRow, RewardRuleInsert, RewardRuleUpdate } from '@/types';

// Suggested activity types for the create dialog.
const SUGGESTED_ACTIVITIES = [
  'VALID_ISSUE_REPORT',
  'VERIFIED_REPORT',
  'ISSUE_RESOLVED',
  'VOLUNTEER_ACTIVITY',
  'DUPLICATE_OR_FAKE_REPORT',
];

export function RewardRulesPage() {
  const { t } = useTranslation();
  const rulesQuery = useRewardRules();
  const createMutation = useCreateRewardRule();
  const updateMutation = useUpdateRewardRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RewardRuleRow | null>(null);
  const [form, setForm] = useState<RewardRuleInsert>({
    activity_type: '',
    title: '',
    points: 0,
    description: '',
    active: true,
  });

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setForm({ activity_type: '', title: '', points: 0, description: '', active: true });
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((rule: RewardRuleRow) => {
    setEditTarget(rule);
    setForm({
      activity_type: rule.activity_type,
      title: rule.title,
      points: rule.points,
      description: rule.description ?? '',
      active: rule.active,
    });
    setDialogOpen(true);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!form.activity_type.trim() || !form.title.trim()) return;

    if (editTarget) {
      const patch: RewardRuleUpdate = {
        title: form.title.trim(),
        points: form.points,
        description: form.description || null,
        active: form.active,
      };
      await updateMutation.mutateAsync({ activityType: editTarget.activity_type, patch });
    } else {
      const input: RewardRuleInsert = {
        activity_type: form.activity_type.trim().toUpperCase().replace(/\s+/g, '_'),
        title: form.title.trim(),
        points: form.points,
        description: form.description || null,
        active: form.active,
      };
      await createMutation.mutateAsync(input);
    }
    setDialogOpen(false);
  }, [form, editTarget, createMutation, updateMutation]);

  const toggleActive = useCallback(
    async (rule: RewardRuleRow) => {
      await updateMutation.mutateAsync({
        activityType: rule.activity_type,
        patch: { active: !rule.active },
      });
    },
    [updateMutation],
  );

  if (rulesQuery.isLoading) {
    return (
      <PageContainer title={t('gamificationAdmin.rulesTitle')}>
        <LoadingState message={t('gamificationAdmin.rulesLoading')} />
      </PageContainer>
    );
  }

  if (rulesQuery.error) {
    return (
      <PageContainer title={t('gamificationAdmin.rulesTitle')}>
        <ErrorState
          title={t('gamificationAdmin.rulesCouldLoad')}
          message={rulesQuery.error instanceof Error ? rulesQuery.error.message : undefined}
          onRetry={() => void rulesQuery.refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={t('gamificationAdmin.rulesTitle')}
      description={t('gamificationAdmin.rulesPageDesc')}
      actions={
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          {t('gamificationAdmin.newRule')}
        </Button>
      }
    >
      {rulesQuery.data && rulesQuery.data.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('gamificationAdmin.tableActivityType')}</TableHead>
                <TableHead>{t('dashboard.tableTitle')}</TableHead>
                <TableHead>{t('gamificationAdmin.tablePoints')}</TableHead>
                <TableHead>{t('gamificationAdmin.tableDescription')}</TableHead>
                <TableHead>{t('gamificationAdmin.tableStatus')}</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rulesQuery.data.map((rule) => (
                <TableRow key={rule.activity_type}>
                  <TableCell className="font-mono text-xs font-medium">
                    {rule.activity_type}
                  </TableCell>
                  <TableCell className="text-sm">{rule.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant={rule.points >= 0 ? 'success' : 'destructive'}
                      className="font-mono"
                    >
                      {rule.points >= 0 ? '+' : ''}{rule.points}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                    {rule.description ?? '—'}
                  </TableCell>
                  <TableCell>
                    {rule.active ? (
                      <Badge variant="success">{t('common.active')}</Badge>
                    ) : (
                      <Badge variant="secondary">{t('common.inactive')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(rule)}>
                           <Pencil className="h-4 w-4" />
                           {t('common.edit')}
                         </DropdownMenuItem>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem
                           onClick={() => toggleActive(rule)}
                           className={rule.active ? 'text-destructive' : 'text-green-600'}
                         >
                           <Power className="h-4 w-4" />
                           {rule.active ? t('gamificationAdmin.deactivate') : t('gamificationAdmin.activate')}
                         </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={Plus}
          title={t('gamificationAdmin.noRules')}
          description={t('gamificationAdmin.noRulesMsg')}
          actionLabel={t('gamificationAdmin.newRule')}
          onAction={openCreate}
        />
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? t('gamificationAdmin.editRule') : t('gamificationAdmin.newRuleTitle')}</DialogTitle>
            <DialogDescription>
              {editTarget
                ? t('gamificationAdmin.editRuleDesc')
                : t('gamificationAdmin.newRuleDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="activity_type">{t('gamificationAdmin.tableActivityType')}</Label>
              <Input
                id="activity_type"
                placeholder={t('gamificationAdmin.activityPlaceholder')}
                value={form.activity_type}
                onChange={(e) => setForm((f) => ({ ...f, activity_type: e.target.value }))}
                disabled={!!editTarget}
                className="font-mono text-sm"
              />
              {!editTarget && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {SUGGESTED_ACTIVITIES.map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, activity_type: act }))}
                      className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    >
                      {act}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="title">{t('dashboard.tableTitle')}</Label>
              <Input
                id="title"
                placeholder={t('gamificationAdmin.ruleTitlePlaceholder')}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="points">{t('gamificationAdmin.tablePoints')}</Label>
              <Input
                id="points"
                type="number"
                placeholder={t('gamificationAdmin.pointsPlaceholder')}
                value={form.points}
                onChange={(e) => setForm((f) => ({ ...f, points: parseInt(e.target.value, 10) || 0 }))}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('gamificationAdmin.pointsHelper')}
              </p>
            </div>
            <div>
              <Label htmlFor="description">{t('gamificationAdmin.tableDescription')}</Label>
              <Textarea
                id="description"
                placeholder={t('gamificationAdmin.pointsDescPlaceholder')}
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.active ?? true}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="active" className="text-sm">{t('common.active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('gamificationAdmin.cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                !form.activity_type.trim() ||
                !form.title.trim() ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editTarget ? t('gamificationAdmin.saveChanges') : t('gamificationAdmin.createRule')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
