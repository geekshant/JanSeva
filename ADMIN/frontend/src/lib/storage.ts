/**
 * Supabase Storage bucket for complaint evidence images. This bucket is
 * PRIVATE (`public = false`), so assets can only be served via short-lived
 * signed URLs minted from the stored `storage_path` — NOT from the
 * `getPublicUrl` placeholder stored in `complaint_images.image_url`.
 */
export const COMPLAINT_IMAGES_BUCKET = 'complaint_images';

/** Signed-URL lifetime in seconds (1 hour). */
export const SIGNED_URL_EXPIRY_SECONDS = 3600;
