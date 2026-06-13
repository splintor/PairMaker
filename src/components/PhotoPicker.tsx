"use client";

import { useRef, useState } from "react";
import { validatePhotoUpload } from "@/lib/photo";

const MAX_EDGE = 1280;

/** Downscale to <=1280px longest edge, return a JPEG blob. Throws "decode" if undecodable. */
async function downscale(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode"));
      i.src = url;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("decode");
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (!blob) throw new Error("decode");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

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
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const check = validatePhotoUpload({ type: file.type, size: file.size });
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setBusy(true);
    try {
      const blob = await downscale(file);
      const fd = new FormData();
      fd.append("file", blob, "photo.jpg");
      const res = await fetch("/api/candidates/photo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "upload");
      setHandle(json.handle);
      setPreview(URL.createObjectURL(blob));
    } catch (err) {
      setError(
        err instanceof Error && err.message === "decode"
          ? "לא ניתן לקרוא את התמונה"
          : "העלאת התמונה נכשלה",
      );
    } finally {
      setBusy(false);
    }
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
    </div>
  );
}
