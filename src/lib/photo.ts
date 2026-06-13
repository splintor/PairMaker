export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

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
