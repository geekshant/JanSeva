import { useState } from 'react';
import { useTranslation } from '@/i18n/translate';
import { Plus, Pencil, Power } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCategories, useCreateCategory, useUpdateCategory } from '@/hooks/useCategories';
import { useAuth } from '@/hooks/useAuth';
import type { CategoryRow, CategoryInsert, CategoryUpdate } from '@/types';

const ICON_OPTIONS = [
  'report_problem', 'add_road', 'delete_outline', 'water_drop',
  'lightbulb_outline', 'domain_disabled', 'engineering', 'pets',
  'security', 'category',
];

export function CategoriesSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const categoriesQuery = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('category');

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setIcon('category');
    setDialogOpen(true);
  };

  const openEdit = (cat: CategoryRow) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description ?? '');
    setIcon(cat.icon ?? 'category');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (editing) {
      const patch: CategoryUpdate = {
        name: name.trim(),
        description: description.trim() || null,
        icon,
      };
      await updateMutation.mutateAsync({ id: editing.id, patch, actorId: user?.id ?? null });
    } else {
      const input: CategoryInsert = {
        name: name.trim(),
        description: description.trim() || null,
        icon,
        active: true,
      };
      await createMutation.mutateAsync({ input, actorId: user?.id ?? null });
    }
    setDialogOpen(false);
  };

  const toggleActive = async (cat: CategoryRow) => {
    await updateMutation.mutateAsync({
      id: cat.id,
      patch: { active: !cat.active },
      actorId: user?.id ?? null,
    });
  };

  return (
    <PageContainer
      title={t('settings.categoriesTitle')}
      description={t('settings.categoriesDesc')}
      actions={
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t('settings.addCategory')}
        </Button>
      }
    >
      <div className="space-y-4">
        {categoriesQuery.error ? (
          <ErrorState title={t('settings.categoriesCouldNotLoad')} onRetry={() => void categoriesQuery.refetch()} />
        ) : categoriesQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : categoriesQuery.data && categoriesQuery.data.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.tableIcon')}</TableHead>
                  <TableHead>{t('settings.tableName')}</TableHead>
                  <TableHead>{t('settings.tableDescription')}</TableHead>
                  <TableHead>{t('settings.tableStatus')}</TableHead>
                  <TableHead className="text-right">{t('dashboard.tableActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriesQuery.data.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-mono text-xs">{cat.icon ?? 'category'}</TableCell>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {cat.description ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.active ? 'success' : 'secondary'}>
                        {cat.active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(cat)}
                          disabled={updateMutation.isPending}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            title={t('settings.noCategories')}
            description={t('settings.noCategoriesMsg')}
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t('settings.editCategory') : t('settings.addCategoryTitle')}</DialogTitle>
            <DialogDescription>
              {editing
                ? t('settings.editCategoryDesc')
                : t('settings.addCategoryDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('settings.nameLabel')}</label>
              <Input
                placeholder={t('settings.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('settings.descOptional')}</label>
              <Input
                placeholder={t('settings.descPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('settings.iconLabel')}</label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      icon === ic ? 'border-primary bg-primary/10 text-primary' : ''
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}>
              {editing ? t('settings.save') : t('settings.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
