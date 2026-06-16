"use client";

import { useRouter } from "next/navigation";
import { CANDIDATE_VIEW_COOKIE, type CandidateView, type ViewPreference } from "@/lib/view";

export function ViewToggle({ view }: { view: ViewPreference }) {
  const router = useRouter();

  function set(v: CandidateView) {
    document.cookie = `${CANDIDATE_VIEW_COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  const base = "flex h-8 w-8 items-center justify-center";
  // In "auto" the effective view is viewport-dependent (list on mobile, tiles on desktop),
  // so the highlight follows the same breakpoint.
  const tilesCls =
    view === "tiles"
      ? "bg-brand-50 text-brand-700"
      : view === "auto"
        ? "text-slate-400 hover:text-slate-600 sm:bg-brand-50 sm:text-brand-700"
        : "text-slate-400 hover:text-slate-600";
  const listCls =
    view === "list"
      ? "bg-brand-50 text-brand-700"
      : view === "auto"
        ? "bg-brand-50 text-brand-700 sm:bg-transparent sm:text-slate-400 sm:hover:text-slate-600"
        : "text-slate-400 hover:text-slate-600";

  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-brand-200">
      <button type="button" onClick={() => set("tiles")} title="תצוגת כרטיסים" aria-label="תצוגת כרטיסים" className={`${base} ${tilesCls}`}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="8" height="8" rx="1" />
          <rect x="13" y="3" width="8" height="8" rx="1" />
          <rect x="3" y="13" width="8" height="8" rx="1" />
          <rect x="13" y="13" width="8" height="8" rx="1" />
        </svg>
      </button>
      <button type="button" onClick={() => set("list")} title="תצוגת רשימה" aria-label="תצוגת רשימה" className={`${base} ${listCls}`}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="8" y1="6" x2="20" y2="6" />
          <line x1="8" y1="12" x2="20" y2="12" />
          <line x1="8" y1="18" x2="20" y2="18" />
          <circle cx="4" cy="6" r="1" fill="currentColor" />
          <circle cx="4" cy="12" r="1" fill="currentColor" />
          <circle cx="4" cy="18" r="1" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
