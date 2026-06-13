"use client";

import { useRouter } from "next/navigation";
import { CANDIDATE_VIEW_COOKIE, type CandidateView } from "@/lib/view";

export function ViewToggle({ view }: { view: CandidateView }) {
  const router = useRouter();

  function set(v: CandidateView) {
    document.cookie = `${CANDIDATE_VIEW_COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  const btn = (active: boolean) =>
    `flex h-8 w-8 items-center justify-center ${active ? "bg-brand-50 text-brand-700" : "text-slate-400 hover:text-slate-600"}`;

  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-brand-200">
      <button type="button" onClick={() => set("tiles")} title="תצוגת כרטיסים" aria-label="תצוגת כרטיסים" className={btn(view === "tiles")}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="8" height="8" rx="1" />
          <rect x="13" y="3" width="8" height="8" rx="1" />
          <rect x="3" y="13" width="8" height="8" rx="1" />
          <rect x="13" y="13" width="8" height="8" rx="1" />
        </svg>
      </button>
      <button type="button" onClick={() => set("list")} title="תצוגת רשימה" aria-label="תצוגת רשימה" className={btn(view === "list")}>
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
