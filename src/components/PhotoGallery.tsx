"use client";

import { useState } from "react";
import { candidatePhotoSrcByHandle } from "@/lib/photo";
import { PhotoLightbox } from "./PhotoLightbox";

/** Thumbnail strip of a candidate's photos with a tap-to-enlarge lightbox. */
export function PhotoGallery({ candidateId, photos }: { candidateId: string; photos: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length <= 1) return null; // the single photo is enlargeable via the avatar

  const src = (h: string) => candidatePhotoSrcByHandle(candidateId, h);

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

      <PhotoLightbox candidateId={candidateId} photos={photos} index={open} onChange={setOpen} />
    </div>
  );
}
