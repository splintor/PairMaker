"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { validatePhotoUpload, communityLogoSrc } from "@/lib/photo";
import { setCommunityLogo } from "@/app/app/settings/actions";

// Reuse the candidate photo cropper (1:1) so the logo is a tidy square.
const PhotoCropModal = dynamic(
  () => import("@/components/PhotoCropModal").then((m) => m.PhotoCropModal),
  { ssr: false },
);

/**
 * Admin control for the community logo (shown in the top bar instead of the
 * default emoji). Uploads a cropped image to the blob, then persists the handle
 * via setCommunityLogo.
 */
export function CommunityLogoField({
  communityId,
  defaultLogoUrl,
}: {
  communityId: string;
  defaultLogoUrl: string | null;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(defaultLogoUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const shownSrc = preview ?? (logoUrl ? communityLogoSrc(communityId, logoUrl) : null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const check = validatePhotoUpload({ type: file.type, size: file.size });
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setCropSrc(URL.createObjectURL(file));
  }

  async function uploadBlob(blob: Blob) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("communityId", communityId);
      fd.append("file", blob, "logo.jpg");
      const res = await fetch("/api/communities/logo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "upload");
      await setCommunityLogo(json.handle);
      setPreview(URL.createObjectURL(blob));
      setLogoUrl(json.handle);
    } catch {
      setError("העלאת הלוגו נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await setCommunityLogo(null);
      setLogoUrl(null);
      setPreview(null);
    } catch {
      setError("הסרת הלוגו נכשלה");
    } finally {
      setBusy(false);
    }
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-xl2 border border-brand-200 bg-white p-4">
      <span className="mb-2 block text-sm text-slate-600">לוגו הקהילה</span>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl2 border border-brand-200 bg-brand-50 text-2xl">
          {shownSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownSrc} alt="לוגו הקהילה" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>💞</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-lg border border-brand-300 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
            >
              {busy ? "מעלה…" : logoUrl ? "החלפת לוגו" : "העלאת לוגו"}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm text-slate-500 hover:text-red-600 disabled:opacity-60"
              >
                הסרה
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400">מוצג בסרגל העליון במקום סמל הלבבות. JPG/PNG/WEBP.</p>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

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
