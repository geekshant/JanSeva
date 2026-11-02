import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/translate';
import { Pencil } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCategoryAiConfigs, useUpdateCategoryAiConfig } from '@/hooks/useAiVerification';
import type { CategoryAiConfigRow, AiReviewThreshold } from '@/types';

interface ConfigForm {
  requires_images: boolean;
  min_images: number;
  max_images: number;
  requires_different_angles: boolean;
  ai_enabled: boolean;
  auto_pass: boolean;
  auto_fail: boolean;
  review_threshold: AiReviewThreshold;
  category_hints: string;
}

const defaultForm: ConfigForm = {
  requires_images: true,
  min_images: 1,
  max_images: 5,
  requires_different_angles: false,
  ai_enabled: true,
  auto_pass: true,
  auto_fail: false,
  review_threshold: 'MEDIUM',
  category_hints: '',
};

export function AiVerificationSettingsPage() {
  const { t } = useTranslation();
  const configsQuery = useCategoryAiConfigs();
  const updateMutation = useUpdateCategoryAiConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryAiConfigRow | null>(null);
  const [form, setForm] = useState<ConfigForm>(defaultForm);

  const openEdit = (config: CategoryAiConfigRow) => {
    setEditing(config);
    setForm({
      requires_images: config.requires_images,
      min_images: config.min_images,
      max_images: config.max_images,
      requires_different_angles: config.requires_different_angles,
      ai_enabled: config.ai_enabled,
      auto_pass: config.auto_pass,
      auto_fail: config.auto_fail,
      review_threshold: config.review_threshold,
      category_hints: config.category_hints ?? '',
    });
    setDialogOpen(true);
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!dialogOpen) {
      setEditing(null);
      setForm(defaultForm);
    }
  }, [dialogOpen]);

  const handleSubmit = async () => {
    if (!editing) return;
    await updateMutation.mutateAsync({
      p_category_id: editing.category_id,
      p_requires_images: form.requires_images,
      p_min_images: form.min_images,
      p_max_images: form.max_images,
      p_requires_different_angles: form.requires_different_angles,
      p_ai_enabled: form.ai_enabled,
      p_auto_pass: form.auto_pass,
      p_auto_fail: form.auto_fail,
      p_review_threshold: form.review_threshold,
      p_category_hints: form.category_hints.trim() || null,
    });
    setDialogOpen(false);
  };

  return (
    <PageContainer
      title={t('aiVerification.settings')}
      description={t('aiVerification.settingsDesc')}
    >
      <div className="space-y-4">
        {configsQuery.error ? (
          <ErrorState
            title={t('aiVerification.couldNotLoad')}
            onRetry={() => void configsQuery.refetch()}
          />
        ) : configsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : configsQuery.data && configsQuery.data.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('aiVerification.tableCategory')}</TableHead>
                  <TableHead className="text-center">{t('aiVerification.tableRequiresImages')}</TableHead>
                  <TableHead className="text-center">{t('aiVerification.tableMinImages')}</TableHead>
                  <TableHead className="text-center">{t('aiVerification.tableMaxImages')}</TableHead>
                  <TableHead className="text-center">{t('aiVerification.tableDifferentAngles')}</TableHead>
                  <TableHead className="text-center">{t('aiVerification.tableAiEnabled')}</TableHead>
                  <TableHead className="text-center">{t('aiVerification.tableAutoPass')}</TableHead>
                  <TableHead className="text-center">{t('aiVerification.tableAutoFail')}</TableHead>
                  <TableHead>{t('aiVerification.tableThreshold')}</TableHead>
                  <TableHead className="text-right">{t('dashboard.tableActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configsQuery.data.map((cfg) => (
                  <TableRow key={cfg.id}>
                    <TableCell className="font-medium">
                      {cfg.categories?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <BooleanBadge value={cfg.requires_images} />
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">{cfg.min_images}</TableCell>
                    <TableCell className="text-center font-mono text-sm">{cfg.max_images}</TableCell>
                    <TableCell className="text-center">
                      <BooleanBadge value={cfg.requires_different_angles} />
                    </TableCell>
                    <TableCell className="text-center">
                      <BooleanBadge value={cfg.ai_enabled} />
                    </TableCell>
                    <TableCell className="text-center">
                      <BooleanBadge value={cfg.auto_pass} />
                    </TableCell>
                    <TableCell className="text-center">
                      <BooleanBadge value={cfg.auto_fail} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{cfg.review_threshold}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(cfg)}>
                        <Pencil className="h-3.5 w-3.5" />
                        {t('aiVerification.editConfig')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            title={t('aiVerification.empty')}
            description={t('aiVerification.settingsDesc')}
          />
        )}
      </div>

      {/* Edit config dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('aiVerification.configDialogTitle')}</DialogTitle>
            <DialogDescription>
              {editing?.categories?.name ?? ''}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            <ToggleRow
              label={t('aiVerification.requiresImages')}
              checked={form.requires_images}
              onChange={(v) => setForm((f) => ({ ...f, requires_images: v }))}
            />
            <ToggleRow
              label={t('aiVerification.requiresDifferentAngles')}
              checked={form.requires_different_angles}
              onChange={(v) => setForm((f) => ({ ...f, requires_different_angles: v }))}
            />
            <ToggleRow
              label={t('aiVerification.aiEnabled')}
              checked={form.ai_enabled}
              onChange={(v) => setForm((f) => ({ ...f, ai_enabled: v }))}
            />
            <ToggleRow
              label={t('aiVerification.autoPass')}
              checked={form.auto_pass}
              onChange={(v) => setForm((f) => ({ ...f, auto_pass: v }))}
            />
            <ToggleRow
              label={t('aiVerification.autoFail')}
              checked={form.auto_fail}
              onChange={(v) => setForm((f) => ({ ...f, auto_fail: v }))}
            />
            <div>
              <Label htmlFor="min-images">{t('aiVerification.minImages')}</Label>
              <Input
                id="min-images"
                type="number"
                min={1}
                value={form.min_images}
                onChange={(e) =>
                  setForm((f) => ({ ...f, min_images: parseInt(e.target.value, 10) || 1 }))
                }
              />
            </div>
            <div>
              <Label htmlFor="max-images">{t('aiVerification.maxImages')}</Label>
              <Input
                id="max-images"
                type="number"
                min={1}
                value={form.max_images}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_images: parseInt(e.target.value, 10) || 1 }))
                }
              />
            </div>
            <div>
              <Label htmlFor="threshold">{t('aiVerification.reviewThreshold')}</Label>
              <Select
                id="threshold"
                value={form.review_threshold}
                onChange={(e) =>
                  setForm((f) => ({ ...f, review_threshold: e.target.value as AiReviewThreshold }))
                }
              >
                <option value="LOW">{t('aiVerification.thresholdLow')}</option>
                <option value="MEDIUM">{t('aiVerification.thresholdMedium')}</option>
                <option value="HIGH">{t('aiVerification.thresholdHigh')}</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="hints">{t('aiVerification.categoryHints')}</Label>
              <Textarea
                id="hints"
                placeholder={t('aiVerification.categoryHintsPlaceholder')}
                value={form.category_hints}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category_hints: e.target.value }))
                }
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateMutation.isPending || !editing}
            >
              {updateMutation.isPending ? t('common.working') : t('common.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// Helper sub-components
// ---------------------------------------------------------------------------

function BooleanBadge({ value }: { value: boolean }) {
  const { t } = useTranslation();
  return value ? (
    <Badge variant="success">{t('common.yes')}</Badge>
  ) : (
    <Badge variant="secondary">{t('common.no')}</Badge>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
