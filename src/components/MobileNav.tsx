"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { NavLink } from "./NavLink";
import { CommunitySwitcher } from "./CommunitySwitcher";
import type { ActiveContext } from "@/lib/community";

export function MobileNav({
  ctx,
  signOutAction,
}: {
  ctx: ActiveContext;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-label="תפריט"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-slate-600 hover:bg-brand-50"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} aria-hidden />
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="ניווט"
            className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[80%] flex-col gap-4 bg-white p-5 shadow-xl outline-none"
          >
            <div className="flex items-center justify-between">
              <Link href="/" onClick={() => setOpen(false)} className="text-lg font-extrabold text-brand-700">💞 PairMaker</Link>
              <button
                type="button"
                aria-label="סגירה"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-brand-50"
              >
                ✕
              </button>
            </div>

            <nav className="flex flex-col gap-1 text-sm" aria-label="ראשי">
              <NavLink href="/app/candidates" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2 hover:bg-brand-50" inactiveClassName="text-slate-600">
                מועמדים
              </NavLink>
              <NavLink href="/app/matches" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2 hover:bg-brand-50" inactiveClassName="text-slate-600">
                שידוכים
              </NavLink>
              {ctx.role === "admin" && (
                <NavLink href="/app/settings" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2 hover:bg-brand-50" inactiveClassName="text-slate-600">
                  הגדרות
                </NavLink>
              )}
            </nav>

            <div className="border-t border-slate-100 pt-4">
              <CommunitySwitcher
                items={ctx.memberships.map((m) => ({
                  communityId: m.communityId,
                  communityName: m.communityName,
                }))}
                activeId={ctx.communityId}
              />
            </div>

            <div className="mt-auto border-t border-slate-100 pt-4">
              <div className="mb-2 text-sm">
                <div className="font-medium text-slate-700">{ctx.userName ?? ctx.userEmail}</div>
              </div>
              <form action={signOutAction}>
                <button className="text-sm text-slate-500 hover:text-slate-700">יציאה</button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
