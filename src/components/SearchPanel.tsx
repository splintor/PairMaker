"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SEARCHABLE_FIELDS } from "@/lib/fields";
import { Select } from "@/components/Select";
import type { SearchParams } from "@/lib/candidate-search";

const inputCls = "w-full rounded-lg border border-brand-200 px-3 py-2.5 text-start";

function FilterControl({
  field,
  params,
}: {
  field: (typeof SEARCHABLE_FIELDS)[number];
  params: SearchParams;
}) {
  if (field.type === "number") {
    return (
      <div>
        <span className="mb-1 block text-sm text-slate-600">{field.label}</span>
        <div className="flex gap-2">
          <input dir="rtl" type="number" name={`${field.key}Min`} placeholder="מ-" defaultValue={params[`${field.key}Min`] ?? ""} className={inputCls} />
          <input dir="rtl" type="number" name={`${field.key}Max`} placeholder="עד" defaultValue={params[`${field.key}Max`] ?? ""} className={inputCls} />
        </div>
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">{field.label}</span>
        <Select name={field.key} options={field.options ?? []} defaultValue={params[field.key] ?? ""} placeholder="הכל" />
      </label>
    );
  }
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600">{field.label}</span>
      <input dir="rtl" type="text" name={field.key} defaultValue={params[field.key] ?? ""} className={inputCls} />
    </label>
  );
}

export function SearchPanel({ params }: { params: SearchParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const advancedFields = SEARCHABLE_FIELDS.filter((f) => f.key !== "name");

  function runSearch() {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const usp = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      const s = String(v).trim();
      if (s) usp.set(k, s);
    }
    const qs = usp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onQuickChange() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runSearch, 400);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch();
    setAdvancedOpen(false);
  }

  function clearAll() {
    setAdvancedOpen(false);
    formRef.current?.reset();
    router.push(pathname);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAdvancedOpen(false);
      }
    }
    if (advancedOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [advancedOpen]);

  // Lock body scroll while the filters drawer is open on mobile.
  useEffect(() => {
    if (!advancedOpen) return;
    if (typeof window === "undefined" || !window.matchMedia("(max-width: 767px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [advancedOpen]);

  return (
    <div ref={containerRef} className="relative">
      <form ref={formRef} onSubmit={onSubmit}>
        <div className="flex items-center gap-2 rounded-xl2 border border-brand-200 bg-white px-3 py-2">
          {/* magnifier */}
          <svg className="h-5 w-5 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="9" r="6" />
            <line x1="14" y1="14" x2="18" y2="18" strokeLinecap="round" />
          </svg>
          <input
            name="q"
            type="search"
            dir="rtl"
            defaultValue={params.q ?? ""}
            onChange={onQuickChange}
            placeholder="חיפוש מהיר (שם, עיסוק, עיר)…"
            className="flex-1 bg-transparent text-start outline-none"
          />
          {/* advanced-search toggle */}
          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            title="חיפוש מתקדם"
            aria-label="חיפוש מתקדם"
            className={`shrink-0 rounded-full p-1.5 hover:bg-brand-50 ${advancedOpen ? "bg-brand-50 text-brand-700" : "text-slate-500"}`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="7" x2="15" y2="7" />
              <circle cx="18" cy="7" r="2.2" fill="currentColor" stroke="none" />
              <line x1="9" y1="17" x2="21" y2="17" />
              <circle cx="6" cy="17" r="2.2" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>

        {advancedOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setAdvancedOpen(false)}
            aria-hidden
          />
        )}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="סינון מתקדם"
          className={
            advancedOpen
              ? "fixed inset-y-0 right-0 z-40 w-80 max-w-[85%] overflow-auto bg-white p-4 shadow-xl " +
                "md:absolute md:inset-auto md:right-0 md:z-30 md:mt-1 md:w-full md:overflow-visible md:rounded-xl2 md:border md:border-brand-200 md:shadow-lg"
              : "hidden"
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {advancedFields.map((f) => (
              <FilterControl key={f.key} field={f} params={params} />
            ))}
            <label className="flex items-center gap-2 self-center text-sm text-slate-600">
              <input type="checkbox" name="inactive" value="1" defaultChecked={params.inactive === "1"} />
              כלול לא-פעילים
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button type="button" onClick={clearAll} className="text-sm text-slate-500 hover:underline">
              ניקוי
            </button>
            <button type="submit" className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600">
              חיפוש
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
