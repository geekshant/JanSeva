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
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { OfficerInsert, OfficerUpdate, OfficerRow, OfficerRole } from '@/types';
import type { DepartmentRow } from '@/types';

interface OfficerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  officer?: OfficerRow | null;
  departments: DepartmentRow[];
  onConfirm: (input: OfficerInsert | OfficerUpdate) => Promise<void>;
}

export function OfficerDialog({
  open,
  onOpenChange,
  officer,
  departments,
  onConfirm,
}: OfficerDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!officer;
  const [profileId, setProfileId] = useState('');
  const [departmentId, setDepartmentId] = useState(officer?.department_id ?? '');
  const [role, setRole] = useState<OfficerRole>(officer?.role ?? 'OFFICER');
  const [title, setTitle] = useState(officer?.title ?? '');
  const [active, setActive] = useState(officer?.active ?? true);
  const [loading, setLoading] = useState(false);

  // Reset form fields when the dialog opens (prevents stale data).
  useEffect(() => {
    if (!open) return;
    setProfileId('');
    setDepartmentId(officer?.department_id ?? '');
    setRole(officer?.role ?? 'OFFICER');
    setTitle(officer?.title ?? '');
    setActive(officer?.active ?? true);
  }, [open, officer]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await onConfirm({
          department_id: departmentId || null,
          role,
          title: title || null,
          active,
        } as OfficerUpdate);
      } else {
        await onConfirm({
          profile_id: profileId,
          department_id: departmentId || null,
          role,
          title: title || null,
          active,
        } as OfficerInsert);
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
            <DialogTitle>{isEdit ? t('officers.editTitle') : t('officers.newTitle')}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? t('officers.editDesc')
                : t('officers.newDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="profileId">{t('officers.profileId')}</Label>
                <Input
                  id="profileId"
                  placeholder={t('officers.profileIdPlaceholder')}
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t('officers.profileIdHelper')}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="department">{t('officers.department')}</Label>
              <Select
                id="department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">{t('officers.unassignedOption')}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t('officers.role')}</Label>
              <Select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as OfficerRole)}
              >
                <option value="OFFICER">{t('officers.roleOfficer')}</option>
                <option value="DEPARTMENT_ADMIN">{t('officers.roleDeptAdmin')}</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">{t('officers.titleOptional')}</Label>
              <Input
                id="title"
                placeholder={t('officers.titlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="active">{t('officers.status')}</Label>
              <Select
                id="active"
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
              >
                <option value="true">{t('officers.active')}</option>
                <option value="false">{t('officers.inactive')}</option>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading || (!isEdit && !profileId)}>
              {loading ? t('officers.saving') : isEdit ? t('officers.saveChanges') : t('officers.createBtn')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
