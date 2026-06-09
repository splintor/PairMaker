"use client";
import { useState } from "react";
import { DEACTIVATION_REASONS } from "@/lib/constants";
import { Select } from "@/components/Select";

export function DeactivateDialog({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-amber-700 hover:underline"
      >
        ⚠️ השבתת מועמד/ת
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-80 rounded-xl2 bg-white p-5 text-right shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <form action={action} className="space-y-3">
              <h2 className="font-bold text-brand-700">השבתת מועמד/ת</h2>
              <div className="block text-sm text-slate-600">
                סיבה
                <div className="mt-1">
                  <Select
                    name="reason"
                    options={DEACTIVATION_REASONS}
                    defaultValue={DEACTIVATION_REASONS[0].value}
                  />
                </div>
              </div>
              <label className="block text-sm text-slate-600">
                הערה (אופציונלי)
                <textarea
                  name="note"
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2"
                />
              </label>
              <div className="flex gap-2">
                <button className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700">
                  אישור
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-brand-200 px-3 py-2 text-sm"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
