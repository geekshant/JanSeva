import { useState, useEffect, type FormEvent } from 'react';
import { useTranslation } from '@/i18n/translate';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { DepartmentInsert, DepartmentUpdate, DepartmentRow } from '@/types';

interface DepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: DepartmentRow | null;
  onConfirm: (input: DepartmentInsert | DepartmentUpdate) => Promise<void>;
}

export function DepartmentDialog({
  open,
  onOpenChange,
  department,
  onConfirm,
}: DepartmentDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!department;
  const [name, setName] = useState(department?.name ?? '');
  const [code, setCode] = useState(department?.code ?? '');
  const [description, setDescription] = useState(department?.description ?? '');
  const [serviceArea, setServiceArea] = useState(department?.service_area ?? '');
  const [active, setActive] = useState(department?.active ?? true);
  const [loading, setLoading] = useState(false);

  // Reset form fields when the dialog opens (prevents stale data).
  useEffect(() => {
    if (!open) return;
    setName(department?.name ?? '');
    setCode(department?.code ?? '');
    setDescription(department?.description ?? '');
    setServiceArea(department?.service_area ?? '');
    setActive(department?.active ?? true);
  }, [open, department]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await onConfirm({
          name,
          description: description || null,
          service_area: serviceArea || null,
          active,
        } as DepartmentUpdate);
      } else {
        await onConfirm({
          name,
          code,
          description: description || null,
          service_area: serviceArea || null,
          active,
        } as DepartmentInsert);
      }
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? t('departments.editTitle') : t('departments.newTitle')}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? t('departments.editDesc')
                : t('departments.newDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('departments.nameLabel')}</Label>
              <Input
                id="name"
                placeholder={t('departments.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">{t('departments.codeLabel')}</Label>
              <Input
                id="code"
                placeholder={t('departments.codePlaceholder')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={isEdit}
              />
              {isEdit && (
                <p className="text-xs text-muted-foreground">
                  {t('departments.codeHelper')}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('departments.descLabel')}</Label>
              <Textarea
                id="description"
                placeholder={t('departments.descPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceArea">{t('departments.serviceArea')}</Label>
              <Input
                id="serviceArea"
                placeholder={t('departments.serviceAreaPlaceholder')}
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="active">{t('departments.statusLabel')}</Label>
              <Select
                id="active"
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
              >
                <option value="true">{t('departments.active')}</option>
                <option value="false">{t('departments.inactive')}</option>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('departments.saving') : isEdit ? t('departments.saveChanges') : t('departments.createBtn')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
