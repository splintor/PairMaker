"use client";

import { useRef, useState } from "react";
import { validatePhotoUpload } from "@/lib/photo";
import { PhotoCropModal } from "@/components/PhotoCropModal";

export function PhotoPicker({
  name,
  defaultPhotoUrl,
  candidateId,
}: {
  name: string;
  defaultPhotoUrl?: string | null;
  candidateId?: string;
}) {
  const initialSrc = defaultPhotoUrl && candidateId ? `/api/candidates/${candidateId}/photo` : null;
  const [preview, setPreview] = useState<string | null>(initialSrc);
  const [handle, setHandle] = useState<string>(defaultPhotoUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setHandle(json.handle);
      setPreview(URL.createObjectURL(blob));
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

  function remove() {
    setHandle("");
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name={name} value={handle} />
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-2xl text-brand-400">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="תצוגה מקדימה" className="h-full w-full object-cover" />
        ) : (
          "📷"
        )}
      </div>
      <div className="space-y-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
          >
            {busy ? "מעלה…" : "בחר תמונה"}
          </button>
          {handle && (
            <button type="button" onClick={remove} className="text-sm text-red-600 hover:underline">
              הסר תמונה
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFile}
          className="hidden"
        />
      </div>

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
