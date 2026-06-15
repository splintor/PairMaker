"use client";

import { usePathname, useRouter } from "next/navigation";

const ENTITY_OPTIONS = [
  { value: "", label: "הכל" },
  { value: "candidate", label: "מועמדים" },
  { value: "suggestion", label: "שידוכים" },
  { value: "membership", label: "שדכנים" },
  { value: "community", label: "קהילה" },
  { value: "auth", label: "התחברויות" },
];

const ACTION_OPTIONS = [
  { value: "", label: "הכל" },
  { value: "create", label: "יצירה" },
  { value: "update", label: "עדכון" },
  { value: "deactivate", label: "השבתה" },
  { value: "reactivate", label: "החזרה לפעילות" },
  { value: "delete", label: "מחיקה" },
  { value: "login", label: "התחברות" },
];

const selectCls = "rounded-lg border border-brand-200 px-2 py-1.5";

export function ActivityFilters({ entityType, action }: { entityType: string; action: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function update(next: { entityType?: string; action?: string }) {
    const et = next.entityType ?? entityType;
    const ac = next.action ?? action;
    const params = new URLSearchParams();
    if (et) params.set("entityType", et);
    if (ac) params.set("action", ac);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl2 border border-brand-200 bg-white p-3 text-sm">
      <label className="flex items-center gap-2">
        סוג:
        <select
          dir="rtl"
          value={entityType}
          onChange={(e) => update({ entityType: e.target.value })}
          className={selectCls}
        >
          {ENTITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        פעולה:
        <select
          dir="rtl"
          value={action}
          onChange={(e) => update({ action: e.target.value })}
          className={selectCls}
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      {(entityType || action) && (
        <button type="button" onClick={() => router.push(pathname)} className="text-brand-600 hover:underline">
          ניקוי
        </button>
      )}
    </div>
  );
}
