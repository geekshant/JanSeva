import { useState, type FormEvent, useEffect } from 'react';
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
import { AlertCircle } from 'lucide-react';
import type { ComplaintStatus } from '@/types';
import type { AdminRole } from '@/lib/workflow';
import { getAllowedTransitions } from '@/lib/workflow';

interface ChangeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: ComplaintStatus;
  role: AdminRole | null;
  onConfirm: (status: ComplaintStatus, comment: string) => Promise<void>;
}

export function ChangeStatusDialog({
  open,
  onOpenChange,
  currentStatus,
  role,
  onConfirm,
}: ChangeStatusDialogProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ComplaintStatus>(currentStatus);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const allowed = role ? getAllowedTransitions(currentStatus, role) : [];

  useEffect(() => {
    if (open) {
      setStatus(allowed[0] ?? currentStatus);
      setComment('');
    }
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(status, comment);
      onOpenChange(false);
      setComment('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('complaints.changeStatusTitle')}</DialogTitle>
            <DialogDescription>
              {t('complaints.changeStatusCurrent', { status: t('status.' + currentStatus.toLowerCase()) })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {allowed.length === 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-amber/30 bg-amber/10 p-3 text-sm text-amber-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {t('complaints.changeStatusWarning', { role: role ?? t('common.unknown') })}
                </span>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="status">{t('complaints.newStatus')}</Label>
                  <Select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ComplaintStatus)}
                  >
                    {allowed.map((s) => (
                      <option key={s} value={s}>
                        {t('status.' + s.toLowerCase())}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comment">{t('complaints.commentOptional')}</Label>
                  <Textarea
                    id="comment"
                    placeholder={t('complaints.commentPlaceholder')}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || allowed.length === 0 || status === currentStatus}
            >
              {loading ? t('complaints.updating') : t('complaints.updateStatus')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
