"use client";

import { useState } from "react";
import { candidatePhotoSrcByHandle } from "@/lib/photo";

/** Thumbnail strip of a candidate's photos with a tap-to-enlarge lightbox. */
export function PhotoGallery({ candidateId, photos }: { candidateId: string; photos: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length <= 1) return null; // the single photo already shows as the avatar

  const src = (h: string) => candidatePhotoSrcByHandle(candidateId, h);
  const show = (i: number) => setOpen((i + photos.length) % photos.length);

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {photos.map((h, i) => (
        <button key={h} type="button" onClick={() => setOpen(i)} className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src(h)}
            alt=""
            className="h-20 w-20 rounded-xl2 border border-brand-200 object-cover hover:opacity-90"
          />
        </button>
      ))}

      {open !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src(photos[open])}
            alt=""
            className="max-h-[85vh] max-w-[90vw] rounded-xl2 object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); show(open - 1); }}
                aria-label="הקודם"
                className="absolute start-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl text-slate-700 hover:bg-white"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); show(open + 1); }}
                aria-label="הבא"
                className="absolute end-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl text-slate-700 hover:bg-white"
              >
                ›
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="סגירה"
            className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 hover:bg-white"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
