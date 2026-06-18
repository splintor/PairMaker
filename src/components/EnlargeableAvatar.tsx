"use client";

import { useState } from "react";
import { CandidateAvatar } from "./CandidateAvatar";
import { PhotoLightbox } from "./PhotoLightbox";

/**
 * Profile avatar that opens a full-screen lightbox on click. Works for a single
 * photo too (the common case), so every candidate's picture is enlargeable. With
 * multiple photos the lightbox can page through all of them.
 */
export function EnlargeableAvatar({
  id,
  name,
  photoUrl,
  photos,
}: {
  id: string;
  name: string;
  photoUrl?: string | null;
  photos: string[];
}) {
  const [open, setOpen] = useState<number | null>(null);

  // No photo → plain (non-clickable) initials avatar.
  if (!photoUrl) return <CandidateAvatar id={id} name={name} photoUrl={photoUrl} size="lg" />;

  // Fall back to the primary handle if the photos array is empty (legacy rows).
  const list = photos.length ? photos : [photoUrl];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(0)}
        aria-label="הגדלת התמונה"
        className="block shrink-0 cursor-zoom-in rounded-full"
      >
        <CandidateAvatar id={id} name={name} photoUrl={photoUrl} size="lg" />
      </button>
      <PhotoLightbox candidateId={id} photos={list} index={open} onChange={setOpen} />
    </>
  );
}
