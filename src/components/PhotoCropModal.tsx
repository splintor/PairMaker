"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

const OUT_EDGE = 512;

/** Crop the source image to the selected square area and return a downscaled JPEG blob. */
async function getCroppedBlob(src: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("decode"));
    i.src = src;
  });
  const edge = Math.min(OUT_EDGE, Math.round(area.width));
  const canvas = document.createElement("canvas");
  canvas.width = edge;
  canvas.height = edge;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("decode");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, edge, edge);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
  if (!blob) throw new Error("decode");
  return blob;
}

export function PhotoCropModal({
  src,
  onCancel,
  onCropped,
}: {
  src: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const onComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  async function confirm() {
    if (!area) return;
    setBusy(true);
    try {
      onCropped(await getCroppedBlob(src, area));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 p-4" dir="rtl">
      <div className="relative h-72 w-72 overflow-hidden rounded-xl2 bg-black">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onComplete}
        />
      </div>
      <input
        type="range"
        min={1}
        max={3}
        step={0.01}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        className="mt-4 w-72"
        aria-label="זום"
      />
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? "שומר…" : "שמירה"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/40 px-5 py-2 text-sm text-white hover:bg-white/10"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}
