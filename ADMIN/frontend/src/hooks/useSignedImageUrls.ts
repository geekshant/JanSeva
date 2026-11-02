import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { COMPLAINT_IMAGES_BUCKET, SIGNED_URL_EXPIRY_SECONDS } from '@/lib/storage';

type SignedImageInput = { id: string; storage_path: string; image_url?: string };

/** True when `image_url` is a Supabase Storage object URL (private bucket). */
function isStorageObjectUrl(url: string | undefined): boolean {
  return !!url && url.includes('/storage/v1/object/');
}

/**
 * Resolves displayable URLs for complaint images stored in the private
 * `complaint_images` bucket.
 *
 * - Supabase-stored images: the stored `image_url` is a `getPublicUrl`
 *   placeholder that is NOT fetchable on a private bucket, so a short-lived
 *   signed URL is minted from `storage_path`.
 * - External/demo URLs (e.g. picsum seed data): used as-is, no signing.
 *
 * Returns a map of `image id -> displayable URL` (or `null` while pending).
 */
export function useSignedImageUrls(
  images: SignedImageInput[],
): Record<string, string | null> {
  const [urls, setUrls] = useState<Record<string, string | null>>({});

  const key = images
    .map((i) => `${i.id}:${i.storage_path}:${i.image_url ?? ''}`)
    .join('|');

  useEffect(() => {
    let cancelled = false;

    // External URLs resolve synchronously; storage URLs need signing.
    const resolved: Record<string, string | null> = {};
    const toSign: { id: string; storage_path: string; fallback: string | null }[] = [];

    images.forEach((i) => {
      if (i.storage_path && isStorageObjectUrl(i.image_url)) {
        toSign.push({ id: i.id, storage_path: i.storage_path, fallback: i.image_url ?? null });
      } else {
        resolved[i.id] = i.image_url ?? null;
      }
    });

    if (toSign.length === 0) {
      setUrls(resolved);
      return;
    }

    (async () => {
      const map: Record<string, string | null> = { ...resolved };
      await Promise.all(
        toSign.map(async ({ id, storage_path, fallback }) => {
          try {
            const { data, error } = await supabase.storage
              .from(COMPLAINT_IMAGES_BUCKET)
              .createSignedUrl(storage_path, SIGNED_URL_EXPIRY_SECONDS);
            if (cancelled) return;
            if (error || !data?.signedUrl) {
              map[id] = fallback;
              return;
            }
            map[id] = data.signedUrl;
          } catch {
            if (!cancelled) map[id] = fallback;
          }
        }),
      );
      if (!cancelled) setUrls(map);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return urls;
}
