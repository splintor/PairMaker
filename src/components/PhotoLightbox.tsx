"use client";

import { useEffect } from "react";
import { candidatePhotoSrcByHandle } from "@/lib/photo";

/**
 * Full-screen photo viewer shared by the profile avatar and the thumbnail strip.
 * Controlled: `index` is the open photo (null = closed); `onChange` sets/clears it.
 */
export function PhotoLightbox({
  candidateId,
  photos,
  index,
  onChange,
}: {
  candidateId: string;
  photos: string[];
  index: number | null;
  onChange: (i: number | null) => void;
}) {
  // Close on Esc while the viewer is open.
  useEffect(() => {
    if (index === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onChange(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onChange]);

  if (index === null || photos.length === 0) return null;

  const src = (h: string) => candidatePhotoSrcByHandle(candidateId, h);
  const show = (i: number) => onChange((i + photos.length) % photos.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={() => onChange(null)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src(photos[index])}
        alt=""
        className="max-h-[85vh] max-w-[90vw] rounded-xl2 object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); show(index - 1); }}
            aria-label="הקודם"
            className="absolute start-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl text-slate-700 hover:bg-white"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); show(index + 1); }}
            aria-label="הבא"
            className="absolute end-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl text-slate-700 hover:bg-white"
          >
            ›
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-label="סגירה"
        className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 hover:bg-white"
      >
        ✕
      </button>
    </div>
  );
}
