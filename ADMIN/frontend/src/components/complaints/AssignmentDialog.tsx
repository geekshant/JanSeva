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
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useDepartments } from '@/hooks/useDepartments';
import { useOfficers } from '@/hooks/useOfficers';
import type { AssignComplaintInput } from '@/services/assignment';

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isReassign: boolean;
  complaintId: string;
  onConfirm: (input: AssignComplaintInput) => Promise<void>;
}

export function AssignmentDialog({
  open,
  onOpenChange,
  isReassign,
  complaintId,
  onConfirm,
}: AssignmentDialogProps) {
  const { t } = useTranslation();
  const departmentsQuery = useDepartments();
  const [departmentId, setDepartmentId] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch officers for the selected department
  const officersQuery = useOfficers({
    departmentId: departmentId || undefined,
    active: true,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setDepartmentId('');
      setOfficerId('');
      setNote('');
    }
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!departmentId || !note.trim()) return;
    setLoading(true);
    try {
      await onConfirm({
        complaintId,
        departmentId: departmentId || undefined,
        officerId: officerId || undefined,
        note: note || undefined,
        assignedBy: null,
      });
      onOpenChange(false);
      setDepartmentId('');
      setOfficerId('');
      setNote('');
    } finally {
      setLoading(false);
    }
  };

  const departments = departmentsQuery.data ?? [];
  const officers = officersQuery.data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isReassign ? t('complaints.assignDialogTitleReassign') : t('complaints.assignDialogTitleAssign')}
            </DialogTitle>
            <DialogDescription>
              {isReassign
                ? t('complaints.assignDialogDescReassign')
                : t('complaints.assignDialogDescAssign')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">{t('complaints.department')}</Label>
              <Select
                id="department"
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setOfficerId('');
                }}
                required
              >
                <option value="">{t('complaints.selectDepartment')}</option>
                {departments.filter((d) => d.active).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </Select>
            </div>

            {/* Officer (filtered by selected department) */}
            <div className="space-y-2">
              <Label htmlFor="officer">{t('complaints.officerOptional')}</Label>
              <Select
                id="officer"
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                disabled={!departmentId}
              >
                <option value="">{t('complaints.selectOfficer')}</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.profiles?.name ?? 'Unknown'}
                    {o.title ? ` — ${o.title}` : ''}
                    {o.ward ? ` · ${o.ward}` : ''}
                    {' · ' + o.availability_status}
                  </option>
                ))}
              </Select>
              {departmentId && officers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No active officers in this department.
                </p>
              )}
            </div>

            {/* Reason (required) */}
            <div className="space-y-2">
              <Label htmlFor="assignNote">
                {t('complaints.noteOptional')} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="assignNote"
                placeholder={t('complaints.assignNotePlaceholder')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                A reason is required for audit purposes.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading || !departmentId || !note.trim()}>
              {loading
                ? t('complaints.assigning')
                : isReassign
                  ? t('complaints.reassign')
                  : t('complaints.assign')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
