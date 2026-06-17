export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PHOTOS = 5; // photos per candidate (first = avatar)

export type PhotoValidation = { ok: true } | { ok: false; message: string };

export function validatePhotoUpload({ type, size }: { type: string; size: number }): PhotoValidation {
  if (!ACCEPTED_PHOTO_TYPES.includes(type as (typeof ACCEPTED_PHOTO_TYPES)[number])) {
    return { ok: false, message: "סוג קובץ לא נתמך (יש להעלות JPG/PNG/WEBP)" };
  }
  if (size > MAX_PHOTO_BYTES) {
    return { ok: false, message: "הקובץ גדול מדי (עד 5MB)" };
  }
  return { ok: true };
}

export function extForType(type: string): string {
  return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
}

/**
 * Cache-busting URL for a candidate's photo. The served route sets a 5-minute
 * cache, but the route URL is stable per candidate — so a new upload (which gets
 * a fresh blob handle) would otherwise be masked by the cached old image. The `v`
 * token is derived from the blob handle, so it changes exactly when the photo does.
 */
export function candidatePhotoSrc(id: string, photoUrl: string): string {
  return `/api/candidates/${id}/photo?v=${encodeURIComponent(photoUrl)}`;
}

/**
 * URL for a specific (non-primary) photo of a candidate by its blob handle. The
 * served route validates the handle is one of the candidate's photos. The handle
 * doubles as the cache-busting token.
 */
export function candidatePhotoSrcByHandle(id: string, handle: string): string {
  return `/api/candidates/${id}/photo?h=${encodeURIComponent(handle)}`;
}
