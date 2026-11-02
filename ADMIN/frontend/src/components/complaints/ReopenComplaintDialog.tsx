import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/translate';
import { RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useReopenComplaintTyped } from '@/hooks/useVerification';
import type { ReopenReasonType } from '@/types';

interface ReopenComplaintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  complaintId: string | null;
  complaintNumber?: string | null;
}

/**
 * Structured reopen dialog. Collects a reason category (radio) plus an
 * optional free-text explanation when "Other" is selected, then calls the
 * `reopen_complaint` RPC via `useReopenComplaintTyped`. The RPC sets
 * status = REOPENED, records reopened_at/by/reason, inserts status history
 * (via trigger), writes an audit log row, and notifies the citizen.
 */
const REASON_OPTIONS: { type: ReopenReasonType; labelKey: string }[] = [
  { type: 'resolution_unsatisfactory', labelKey: 'reopenDialog.reasonResolutionUnsatisfactory' },
  { type: 'issue_persists', labelKey: 'reopenDialog.reasonIssuePersists' },
  { type: 'problem_returned', labelKey: 'reopenDialog.reasonProblemReturned' },
  { type: 'incorrectly_resolved', labelKey: 'reopenDialog.reasonIncorrectlyResolved' },
  { type: 'new_evidence', labelKey: 'reopenDialog.reasonNewEvidence' },
];

export function ReopenComplaintDialog({
  open,
  onOpenChange,
  complaintId,
  complaintNumber,
}: ReopenComplaintDialogProps) {
  const { t } = useTranslation();
  const reopenMutation = useReopenComplaintTyped();

  const [reasonType, setReasonType] = useState<ReopenReasonType | ''>('');
  const [otherReason, setOtherReason] = useState('');

  // Reset state whenever the dialog is opened (so stale input from a
  // previous complaint doesn't leak into the next one).
  useEffect(() => {
    if (open) {
      setReasonType('');
      setOtherReason('');
    }
  }, [open, complaintId]);

  const isOther = reasonType === 'other';
  const canConfirm =
    reasonType !== '' && (!isOther || otherReason.trim().length > 0);

  const handleClose = () => {
    if (reopenMutation.isPending) return; // don't allow closing mid-submit
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (!complaintId || !canConfirm || reopenMutation.isPending) return;
    const type = (reasonType || 'other') as ReopenReasonType;
    // For predefined reasons, send the human-readable label as the stored
    // reason text (the RPC also stores the machine-readable type in the
    // audit log). For "other", send the reviewer's custom text.
    let reasonText: string;
    if (isOther) {
      reasonText = otherReason.trim();
    } else {
      const opt = REASON_OPTIONS.find((o) => o.type === type);
      reasonText = opt ? t(opt.labelKey) : otherReason.trim();
    }

    try {
      await reopenMutation.mutateAsync({
        complaintId,
        reasonType: type,
        reason: reasonText,
      });
      onOpenChange(false);
    } catch {
      // toast handled by the mutation's onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            {t('reopenDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('reopenDialog.description')}
            {complaintNumber && (
              <span className="mt-1 block font-mono text-xs font-medium text-muted-foreground">
                {complaintNumber}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup
            value={reasonType}
            onValueChange={(val) => setReasonType(val as ReopenReasonType)}
            className="space-y-2"
          >
            {REASON_OPTIONS.map((opt) => (
              <div
                key={opt.type}
                className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <RadioGroupItem value={opt.type} id={`reopen-${opt.type}`} className="mt-0.5" />
                <Label
                  htmlFor={`reopen-${opt.type}`}
                  className="cursor-pointer text-sm font-normal leading-snug"
                >
                  {t(opt.labelKey)}
                </Label>
              </div>
            ))}
            {/* Other option */}
            <div
              className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <RadioGroupItem value="other" id="reopen-other" className="mt-0.5" />
              <Label
                htmlFor="reopen-other"
                className="cursor-pointer text-sm font-normal leading-snug"
              >
                {t('reopenDialog.reasonOther')}
              </Label>
            </div>
          </RadioGroup>

          {isOther && (
            <div className="space-y-2 pl-1">
              <Label htmlFor="reopen-other-text">
                {t('reopenDialog.otherReasonLabel')}
              </Label>
              <Textarea
                id="reopen-other-text"
                placeholder={t('reopenDialog.otherReasonPlaceholder')}
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                rows={3}
                className="resize-none"
                autoFocus
              />
              {!otherReason.trim() && (
                <p className="text-xs text-muted-foreground">
                  {t('reopenDialog.otherReasonRequired')}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={reopenMutation.isPending}>
            {t('reopenDialog.cancel')}
          </Button>
          <Button
            variant="default"
            onClick={handleConfirm}
            disabled={!canConfirm || reopenMutation.isPending}
          >
            {reopenMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('reopenDialog.reopening')}
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                {t('reopenDialog.confirm')}
              </>
            )}
          </Button>
        </DialogFooter>
    </DialogContent>
  </Dialog>
  );
}

