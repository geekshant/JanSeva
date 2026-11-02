import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/translate';
import { ShieldBan, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SuspendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citizenName: string;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function SuspendDialog({
  open,
  onOpenChange,
  citizenName,
  onConfirm,
  loading,
}: SuspendDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldBan className="h-5 w-5 text-destructive" />
            {t('citizens.suspendTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('citizens.suspendDesc', { name: citizenName })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason">{t('citizens.suspendReasonLabel')}</Label>
          <Textarea
            id="reason"
            placeholder={t('citizens.suspendPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="resize-none"
          />
          {!reason.trim() && (
            <p className="text-xs text-muted-foreground">{t('citizens.suspendReasonRequired')}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('citizens.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || loading}
          >
            <AlertTriangle className="h-4 w-4" />
            {t('citizens.suspendBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
