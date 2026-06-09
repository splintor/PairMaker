"use client";
import { useRef } from "react";
import { DEACTIVATION_REASONS } from "@/lib/constants";

export function DeactivateDialog({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="text-sm text-amber-700 hover:underline"
      >
        ⚠️ השבתת מועמד/ת
      </button>
      <dialog ref={ref} className="rounded-xl2 p-0 backdrop:bg-black/30">
        <form action={action} className="w-80 space-y-3 p-5 text-right">
          <h2 className="font-bold text-brand-700">השבתת מועמד/ת</h2>
          <label className="block text-sm text-slate-600">
            סיבה
            <select name="reason" required className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2">
              {DEACTIVATION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-600">
            הערה (אופציונלי)
            <textarea name="note" rows={2} className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <button className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white">אישור</button>
            <button type="button" onClick={() => ref.current?.close()} className="rounded-lg border border-brand-200 px-3 py-2 text-sm">
              ביטול
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
