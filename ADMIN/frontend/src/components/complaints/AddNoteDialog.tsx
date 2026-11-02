import { useState, type FormEvent } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface AddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (note: string) => Promise<void>;
}

export function AddNoteDialog({
  open,
  onOpenChange,
  onConfirm,
}: AddNoteDialogProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setLoading(true);
    try {
      await onConfirm(note.trim());
      onOpenChange(false);
      setNote('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('complaints.addNoteTitle')}</DialogTitle>
            <DialogDescription>
              {t('complaints.addNoteDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="note" className="mb-2 block">
              {t('complaints.noteLabel')}
            </Label>
            <Textarea
              id="note"
              placeholder={t('complaints.notePlaceholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading || !note.trim()}>
              {loading ? t('complaints.adding') : t('complaints.addNote')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
