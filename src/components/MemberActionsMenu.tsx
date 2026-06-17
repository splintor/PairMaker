"use client";

import { useEffect, useRef, useState } from "react";
import {
  sendInvitation,
  removeMember,
  setMemberBlocked,
  whatsappInviteHref,
} from "@/app/app/settings/actions";

/** Kebab menu consolidating per-member actions in the settings list. */
export function MemberActionsMenu({
  membershipId,
  blocked,
  hasPhone,
  hasEmail,
  isSelf,
}: {
  membershipId: string;
  blocked: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  isSelf: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function onWhatsapp() {
    setError(null);
    setBusy(true);
    // Open the tab synchronously to keep the user gesture (avoids popup blocking).
    const win = window.open("", "_blank");
    try {
      const res = await whatsappInviteHref(membershipId);
      if (res.ok) {
        if (win) win.location.href = res.href;
        else window.location.href = res.href;
        setOpen(false);
      } else {
        win?.close();
        setError(res.error);
      }
    } catch {
      win?.close();
      setError("יצירת ההזמנה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  const itemCls = "block w-full px-4 py-2 text-start text-sm hover:bg-brand-50 disabled:opacity-50";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="פעולות"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-slate-500 hover:bg-brand-50"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute end-0 z-30 mt-1 w-52 overflow-hidden rounded-xl2 border border-brand-200 bg-white py-1 shadow-lg">
          {/* No point inviting someone who's blocked from the app. */}
          {!blocked && hasEmail && (
            <form action={sendInvitation.bind(null, membershipId)}>
              <button type="submit" className={`${itemCls} text-slate-700`}>
                שליחת הזמנה במייל
              </button>
            </form>
          )}
          {!blocked && hasPhone && hasEmail && (
            <button type="button" onClick={onWhatsapp} disabled={busy} className={`${itemCls} text-emerald-700`}>
              {busy ? "מכין הזמנה…" : "שליחת הזמנה בוואטסאפ"}
            </button>
          )}
          {!isSelf && (
            <form action={setMemberBlocked.bind(null, membershipId, !blocked)}>
              <button type="submit" className={`${itemCls} ${blocked ? "text-emerald-700" : "text-amber-700"}`}>
                {blocked ? "ביטול חסימה" : "חסימת גישה"}
              </button>
            </form>
          )}
          <form action={removeMember.bind(null, membershipId)}>
            <button type="submit" className={`${itemCls} text-red-600`}>
              הסרה מהקהילה
            </button>
          </form>
          {error && <p className="px-4 py-1 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
