import { useState } from 'react';
import { useTranslation } from '@/i18n/translate';
import {
  ImagePlus,
  Trash2,
  Upload,
  X,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { COMPLAINT_IMAGES_BUCKET } from '@/lib/storage';
import { useSignedImageUrls } from '@/hooks/useSignedImageUrls';
import {
  useResolutionEvidence,
  useAddResolutionEvidence,
  useDeleteResolutionEvidence,
} from '@/hooks/useVerification';
import { useAuth } from '@/hooks/useAuth';
import { canUploadEvidence } from '@/lib/workflow';
import type { AdminRole } from '@/lib/workflow';
import type { ComplaintImageRow } from '@/types';

interface ResolutionEvidencePanelProps {
  complaintId: string;
  beforeImages: ComplaintImageRow[];
  resolved: boolean;
  role: AdminRole | null;
}

export function ResolutionEvidencePanel({
  complaintId,
  beforeImages,
  resolved,
  role,
}: ResolutionEvidencePanelProps) {
  const { t } = useTranslation();
  const evidenceQuery = useResolutionEvidence(complaintId);
  const addMutation = useAddResolutionEvidence();
  const deleteMutation = useDeleteResolutionEvidence();
  const { user } = useAuth();

  // The `complaint_images` bucket is private, so the stored `image_url`
  // (a getPublicUrl placeholder) cannot be rendered directly. Mint signed
  // URLs from each row's `storage_path` before display.
  const beforeUrls = useSignedImageUrls(beforeImages);
  const evidence = evidenceQuery.data ?? [];
  const afterUrls = useSignedImageUrls(evidence);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const canUpload = canUploadEvidence(role ?? 'OFFICER') && resolved;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    setUploading(true);

    try {
      const ext = selectedFile.name.split('.').pop();
      // Prefix with the uploader's uid so the owner-scoped storage INSERT
      // policy (`foldername(name)[1] = auth.uid()`) is satisfied and the file
      // is co-located with the uploader's own folder.
      const path = `${user.id}/resolution/${complaintId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(COMPLAINT_IMAGES_BUCKET)
        .upload(path, selectedFile);
      if (uploadError) throw uploadError;

      // `image_url` is stored as a getPublicUrl placeholder to satisfy the
      // NOT NULL column; the bucket is private so this URL is NOT directly
      // fetchable — the display layer mints a signed URL from `storage_path`.
      const { data: urlData } = supabase.storage
        .from(COMPLAINT_IMAGES_BUCKET)
        .getPublicUrl(path);

      await addMutation.mutateAsync({
        complaint_id: complaintId,
        storage_path: path,
        image_url: urlData.publicUrl,
        uploaded_by: user.id,
        caption: caption || null,
      });

      setUploadOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption('');
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync({ id, complaintId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {t('complaints.resolutionEvidence')}
          </span>
          {canUpload && (
            <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
              <ImagePlus className="h-4 w-4" />
              {t('complaints.upload')}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {evidenceQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : evidence.length > 0 ? (
          <div className="space-y-4">
            {/* Before / After comparison */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Before */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('complaints.beforeOriginal')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {beforeImages.map((img) => {
                    const src = beforeUrls[img.id];
                    return (
                      <a
                        key={img.id}
                        href={src ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted"
                      >
                        {src ? (
                          <img
                            src={src}
                            alt={t('complaints.before')}
                            className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        )}
                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                          {t('complaints.before')}
                        </span>
                      </a>
                    );
                  })}
                  {beforeImages.length === 0 && (
                    <p className="text-xs text-muted-foreground">{t('complaints.noBeforeImages')}</p>
                  )}
                </div>
              </div>

              {/* After */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('complaints.afterResolution')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {evidence.map((ev) => {
                    const src = afterUrls[ev.id];
                    return (
                      <div key={ev.id} className="group relative overflow-hidden rounded-md border">
                        <a
                          href={src ?? undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex aspect-square items-center justify-center bg-muted"
                        >
                          {src ? (
                          <img
                            src={src}
                            alt={t('complaints.after')}
                            className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                          />
                          ) : (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          )}
                        </a>
                        <span className="absolute bottom-1 left-1 rounded bg-green-600/80 px-1.5 py-0.5 text-[10px] text-white">
                          {t('complaints.after')}
                        </span>
                        {canUpload && (
                          <button
                            onClick={() => handleDelete(ev.id)}
                            className="absolute right-1 top-1 rounded bg-destructive/80 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label={t('complaints.deleteEvidence')}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        {ev.caption && (
                          <p className="truncate p-1 text-[10px] text-muted-foreground">
                            {ev.caption}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Evidence metadata */}
            <div className="space-y-1 text-xs text-muted-foreground">
              {evidence.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between rounded-md border p-2">
                  <span>
                    Uploaded {new Date(ev.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {ev.caption && <span className="truncate">"{ev.caption}"</span>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {resolved
              ? t('complaints.noResolutionEvidence')
              : t('complaints.resolutionEvidenceHint')}
          </p>
        )}
      </CardContent>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5" />
              {t('complaints.uploadDialogTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('complaints.uploadDialogDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="evidence-file">{t('complaints.imageLabel')}</Label>
              <Input
                id="evidence-file"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
              />
            </div>
            {previewUrl && (
              <div className="relative overflow-hidden rounded-md border">
                <img src={previewUrl} alt={t('complaints.previewAlt')} className="max-h-48 w-full object-contain" />
                <button
                  onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div>
              <Label htmlFor="caption">{t('complaints.captionLabel')}</Label>
              <Input
                id="caption"
                placeholder={t('complaints.captionPlaceholder')}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              <Upload className="h-4 w-4" />
              {uploading ? t('complaints.uploading') : t('complaints.upload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
