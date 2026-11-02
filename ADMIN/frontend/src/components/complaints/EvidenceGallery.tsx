import { useState } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSignedImageUrls } from '@/hooks/useSignedImageUrls';
import type { ComplaintImageRow } from '@/types';

/**
 * Evidence gallery — displays complaint images from Supabase Storage.
 * The `complaint_images` bucket is private, so each image's `storage_path` is
 * exchanged for a short-lived signed URL before rendering. Shows a thumbnail
 * grid with a full-screen lightbox on click.
 */
export function EvidenceGallery({ images }: { images: ComplaintImageRow[] }) {
  const { t } = useTranslation();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const signedUrls = useSignedImageUrls(images);

  if (images.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-4 w-4" />
          {t('complaints.evidenceCount', { count: images.length })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => {
            const src = signedUrls[img.id];
            return (
              <button
                key={img.id}
                onClick={() => src && setLightbox(src)}
                className="group relative flex h-32 items-center justify-center overflow-hidden rounded-md border bg-muted"
              >
                {src ? (
                  <img
                    src={src}
                    alt={t('complaints.evidenceImgAlt')}
                    className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>

        {/* Lightbox */}
        {lightbox && (
          <Dialog open onOpenChange={(open) => !open && setLightbox(null)}>
            <DialogContent className="max-w-3xl border-0 p-0">
              <DialogTitle className="sr-only">{t('complaints.evidence')}</DialogTitle>
              <div className="relative">
                <img
                  src={lightbox}
                  alt={t('complaints.evidenceFullAlt')}
                  className="w-full rounded-lg"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

/** Skeleton loader for the evidence gallery. */
export function EvidenceGallerySkeleton() {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-4 w-4" />
          {t('complaints.evidence')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex h-32 items-center justify-center rounded-md border bg-muted"
            >
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
