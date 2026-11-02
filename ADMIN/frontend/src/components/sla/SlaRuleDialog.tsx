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
import type { SlaRuleInsert, SlaRuleUpdate, SlaRuleRow, ComplaintSeverity } from '@/types';
import type { CategoryRow, DepartmentRow } from '@/types';

interface SlaRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: SlaRuleRow | null;
  categories: CategoryRow[];
  departments: DepartmentRow[];
  onConfirm: (input: SlaRuleInsert | SlaRuleUpdate) => Promise<void>;
}

export function SlaRuleDialog({
  open,
  onOpenChange,
  rule,
  categories,
  departments,
  onConfirm,
}: SlaRuleDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!rule;
  const [categoryId, setCategoryId] = useState(rule?.category_id ?? '');
  const [departmentId, setDepartmentId] = useState(rule?.department_id ?? '');
  const [severity, setSeverity] = useState<ComplaintSeverity>(rule?.severity ?? 'MEDIUM');
  const [deadlineHours, setDeadlineHours] = useState(rule?.deadline_hours ?? 72);
  const [warningHours, setWarningHours] = useState(rule?.warning_hours ?? 24);
  const [criticalHours, setCriticalHours] = useState(rule?.critical_hours ?? 12);
  const [active, setActive] = useState(rule?.active ?? true);
  const [loading, setLoading] = useState(false);

  // Reset form fields when the dialog opens (prevents stale data when reusing
  // the same dialog instance to edit a different record).
  useEffect(() => {
    if (!open) return;
    setCategoryId(rule?.category_id ?? '');
    setDepartmentId(rule?.department_id ?? '');
    setSeverity(rule?.severity ?? 'MEDIUM');
    setDeadlineHours(rule?.deadline_hours ?? 72);
    setWarningHours(rule?.warning_hours ?? 24);
    setCriticalHours(rule?.critical_hours ?? 12);
    setActive(rule?.active ?? true);
  }, [open, rule]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await onConfirm({
          deadline_hours: deadlineHours,
          warning_hours: warningHours,
          critical_hours: criticalHours,
          active,
        } as SlaRuleUpdate);
      } else {
        await onConfirm({
          category_id: categoryId || null,
          department_id: departmentId || null,
          severity,
          deadline_hours: deadlineHours,
          warning_hours: warningHours,
          critical_hours: criticalHours,
          active,
        } as SlaRuleInsert);
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
            <DialogTitle>{isEdit ? t('sla.editTitle') : t('sla.newTitle')}</DialogTitle>
            <DialogDescription>
              {t('sla.slaRuleDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!isEdit && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="category">{t('sla.categoryOptional')}</Label>
                  <Select
                    id="category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">{t('sla.allCategories')}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">{t('sla.departmentOptional')}</Label>
                  <Select
                    id="department"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                  >
                    <option value="">{t('sla.allDepartments')}</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">{t('sla.severityLabel')}</Label>
                  <Select
                    id="severity"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as ComplaintSeverity)}
                  >
                    <option value="LOW">{t('severity.low')}</option>
                    <option value="MEDIUM">{t('severity.medium')}</option>
                    <option value="HIGH">{t('severity.high')}</option>
                    <option value="CRITICAL">{t('severity.critical')}</option>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="deadlineHours">{t('sla.deadlineHours')}</Label>
              <Input
                id="deadlineHours"
                type="number"
                min={1}
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(Number(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t('sla.deadlineHelper')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warningHours">{t('sla.warningHours')}</Label>
                <Input
                  id="warningHours"
                  type="number"
                  min={0}
                  value={warningHours}
                  onChange={(e) => setWarningHours(Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="criticalHours">{t('sla.criticalHours')}</Label>
                <Input
                  id="criticalHours"
                  type="number"
                  min={0}
                  value={criticalHours}
                  onChange={(e) => setCriticalHours(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="active">{t('sla.tableStatus')}</Label>
              <Select
                id="active"
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
              >
                <option value="true">{t('common.active')}</option>
                <option value="false">{t('common.inactive')}</option>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('sla.saving') : isEdit ? t('sla.saveChanges') : t('sla.createRule')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
