"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { validatePhotoUpload, candidatePhotoSrcByHandle, MAX_PHOTOS } from "@/lib/photo";

// The cropper pulls in react-easy-crop; load it only when a photo is actually
// being cropped so it stays out of the new/edit page's initial bundle.
const PhotoCropModal = dynamic(
  () => import("@/components/PhotoCropModal").then((m) => m.PhotoCropModal),
  { ssr: false },
);

/**
 * Manages a candidate's ordered list of photos (up to MAX_PHOTOS). The first
 * photo is the primary/avatar. Submits the ordered blob handles as a JSON array
 * in a hidden input; the server action mirrors photos[0] into photoUrl.
 */
export function PhotoPicker({
  name,
  defaultPhotos = [],
  candidateId,
}: {
  name: string;
  defaultPhotos?: string[];
  candidateId?: string;
}) {
  const [photos, setPhotos] = useState<string[]>(defaultPhotos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  // Object URLs for photos uploaded in this session (not yet served via the API).
  const freshPreviews = useRef<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  function previewSrc(handle: string): string {
    return (
      freshPreviews.current[handle] ??
      (candidateId ? candidatePhotoSrcByHandle(candidateId, handle) : "")
    );
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const check = validatePhotoUpload({ type: file.type, size: file.size });
    if (!check.ok) {
      setError(check.message);
      return;
    }
    // Open the crop modal; the upload happens once the user confirms a crop.
    setCropSrc(URL.createObjectURL(file));
  }

  async function uploadBlob(blob: Blob) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "photo.jpg");
      const res = await fetch("/api/candidates/photo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "upload");
      freshPreviews.current[json.handle] = URL.createObjectURL(blob);
      setPhotos((prev) => [...prev, json.handle]);
    } catch {
      setError("העלאת התמונה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(handle: string) {
    setPhotos((prev) => prev.filter((h) => h !== handle));
    const fresh = freshPreviews.current[handle];
    if (fresh) {
      URL.revokeObjectURL(fresh);
      delete freshPreviews.current[handle];
    }
  }

  function makePrimary(handle: string) {
    setPhotos((prev) => [handle, ...prev.filter((h) => h !== handle)]);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(photos)} />
      <div className="flex flex-wrap items-start gap-3">
        {photos.map((handle, i) => (
          <div key={handle} className="relative">
            <div className="h-20 w-20 overflow-hidden rounded-xl2 border border-brand-200 bg-brand-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc(handle)} alt="" className="h-full w-full object-cover" />
            </div>
            {i === 0 ? (
              <span className="absolute bottom-1 start-1 rounded bg-brand-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                ראשי
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makePrimary(handle)}
                title="הפוך לתמונה ראשית"
                className="absolute bottom-1 start-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 hover:bg-white"
              >
                הפוך לראשי
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(handle)}
              title="הסר תמונה"
              aria-label="הסר תמונה"
              className="absolute -end-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow hover:text-red-600"
            >
              ✕
            </button>
          </div>
        ))}

        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl2 border-2 border-dashed border-brand-300 text-brand-500 hover:bg-brand-50 disabled:opacity-60"
          >
            <span className="text-2xl leading-none">{busy ? "…" : "+"}</span>
            <span className="text-[11px]">{busy ? "מעלה" : "הוסף תמונה"}</span>
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400">התמונה הראשונה משמשת כתמונת הפרופיל. עד {MAX_PHOTOS} תמונות.</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFile}
        className="hidden"
      />

      {cropSrc && (
        <PhotoCropModal
          src={cropSrc}
          onCancel={closeCrop}
          onCropped={async (blob) => {
            await uploadBlob(blob);
            closeCrop();
          }}
        />
      )}
    </div>
  );
}
