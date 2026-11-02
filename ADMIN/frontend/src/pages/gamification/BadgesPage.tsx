import { useState, useCallback } from 'react';
import { useTranslation } from '@/i18n/translate';
import { Award, Plus, MoreHorizontal, Pencil, Power } from 'lucide-react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageContainer } from '@/components/layout/PageContainer';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useBadges, useCreateBadge, useUpdateBadge } from '@/hooks/useGamification';
import type { BadgeRow, BadgeInsert, BadgeUpdate } from '@/types';

// Common lucide icon names for the badge icon picker.
const BADGE_ICONS = [
  'rocket_launch',
  'verified',
  'flag',
  'visibility',
  'groups',
  'lightbulb',
  'emoji_events',
  'star',
  'shield',
  'heart',
  'zap',
  'target',
];

export function BadgesPage() {
  const { t } = useTranslation();
  const badgesQuery = useBadges();
  const createMutation = useCreateBadge();
  const updateMutation = useUpdateBadge();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BadgeRow | null>(null);
  const [form, setForm] = useState<BadgeInsert>({
    name: '',
    description: '',
    icon: 'award',
    criteria: '',
    active: true,
  });

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setForm({ name: '', description: '', icon: 'award', criteria: '', active: true });
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((badge: BadgeRow) => {
    setEditTarget(badge);
    setForm({
      name: badge.name,
      description: badge.description ?? '',
      icon: badge.icon ?? 'award',
      criteria: badge.criteria ?? '',
      active: badge.active,
    });
    setDialogOpen(true);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!form.name.trim()) return;

    if (editTarget) {
      const patch: BadgeUpdate = {
        name: form.name.trim(),
        description: form.description || null,
        icon: form.icon || null,
        criteria: form.criteria || null,
        active: form.active,
      };
      await updateMutation.mutateAsync({ id: editTarget.id, patch });
    } else {
      const input: BadgeInsert = {
        name: form.name.trim(),
        description: form.description || null,
        icon: form.icon || null,
        criteria: form.criteria || null,
        active: form.active,
      };
      await createMutation.mutateAsync(input);
    }
    setDialogOpen(false);
  }, [form, editTarget, createMutation, updateMutation]);

  const toggleActive = useCallback(
    async (badge: BadgeRow) => {
      await updateMutation.mutateAsync({
        id: badge.id,
        patch: { active: !badge.active },
      });
    },
    [updateMutation],
  );

  if (badgesQuery.isLoading) {
    return (
      <PageContainer title={t('gamificationAdmin.badgesTitle')}>
        <LoadingState message={t('gamificationAdmin.badgesLoading')} />
      </PageContainer>
    );
  }

  if (badgesQuery.error) {
    return (
      <PageContainer title={t('gamificationAdmin.badgesTitle')}>
        <ErrorState
          title={t('gamificationAdmin.badgesCouldLoad')}
          message={badgesQuery.error instanceof Error ? badgesQuery.error.message : undefined}
          onRetry={() => void badgesQuery.refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={t('gamificationAdmin.badgesTitle')}
      description={t('gamificationAdmin.badgesPageDesc')}
      actions={
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          {t('gamificationAdmin.newBadge')}
        </Button>
      }
    >
      {badgesQuery.data && badgesQuery.data.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('gamificationAdmin.tableIcon')}</TableHead>
                <TableHead>{t('gamificationAdmin.tableName')}</TableHead>
                <TableHead>{t('gamificationAdmin.tableDescription')}</TableHead>
                <TableHead>{t('gamificationAdmin.tableCriteria')}</TableHead>
                <TableHead>{t('gamificationAdmin.tableStatus')}</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {badgesQuery.data.map((badge) => (
                <TableRow key={badge.id}>
                  <TableCell>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15">
                      <Award className="h-4 w-4 text-amber-600" />
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{badge.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {badge.description ?? '—'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                    {badge.criteria ?? '—'}
                  </TableCell>
                  <TableCell>
                    {badge.active ? (
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
                        <DropdownMenuItem onClick={() => openEdit(badge)}>
                           <Pencil className="h-4 w-4" />
                           {t('common.edit')}
                         </DropdownMenuItem>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem
                           onClick={() => toggleActive(badge)}
                           className={badge.active ? 'text-destructive' : 'text-green-600'}
                         >
                           <Power className="h-4 w-4" />
                           {badge.active ? t('gamificationAdmin.deactivate') : t('gamificationAdmin.activate')}
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
          icon={Award}
          title={t('gamificationAdmin.noBadges')}
          description={t('gamificationAdmin.noBadgesMsg')}
          actionLabel={t('gamificationAdmin.newBadge')}
          onAction={openCreate}
        />
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {editTarget ? t('gamificationAdmin.editBadge') : t('gamificationAdmin.newBadgeTitle')}
            </DialogTitle>
            <DialogDescription>
              {editTarget
                ? t('gamificationAdmin.editBadgeDesc')
                : t('gamificationAdmin.newBadgeDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{t('gamificationAdmin.tableName')}</Label>
              <Input
                id="name"
                placeholder={t('gamificationAdmin.namePlaceholder')}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="description">{t('gamificationAdmin.tableDescription')}</Label>
              <Textarea
                id="description"
                placeholder={t('gamificationAdmin.descPlaceholder')}
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>
            <div>
              <Label htmlFor="icon">{t('gamificationAdmin.tableIcon')}</Label>
              <Select
                id="icon"
                value={form.icon ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              >
                {BADGE_ICONS.map((ic) => (
                  <option key={ic} value={ic}>
                    {ic}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="criteria">{t('gamificationAdmin.tableCriteria')}</Label>
              <Textarea
                id="criteria"
                placeholder={t('gamificationAdmin.criteriaPlaceholder')}
                value={form.criteria ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, criteria: e.target.value }))}
                rows={2}
                className="resize-none font-mono text-xs"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('gamificationAdmin.criteriaHelper')}
              </p>
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
              disabled={!form.name.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {editTarget ? t('gamificationAdmin.saveChanges') : t('gamificationAdmin.createBadge')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
