import { SEARCHABLE_FIELDS } from "@/lib/fields";
import { Select } from "@/components/Select";
import type { SearchParams } from "@/lib/candidate-search";

const inputCls = "w-full rounded-lg border border-brand-200 px-3 py-2.5 text-right";

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
  const advancedFields = SEARCHABLE_FIELDS.filter((f) => f.key !== "name");
  const advancedOpen = advancedFields.some(
    (f) =>
      (params[f.key]?.trim() ?? "") !== "" ||
      (params[`${f.key}Min`]?.trim() ?? "") !== "" ||
      (params[`${f.key}Max`]?.trim() ?? "") !== "",
  );

  return (
    <form method="get" className="space-y-3">
      <div className="flex gap-2">
        <input
          dir="rtl"
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="חיפוש מהיר (שם, עיסוק, עיר)…"
          className={inputCls}
        />
        <button className="shrink-0 rounded-lg bg-brand-500 px-5 py-2.5 font-medium text-white hover:bg-brand-600">
          חיפוש
        </button>
      </div>

      <details open={advancedOpen} className="rounded-xl2 border border-brand-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-brand-700">
          סינון מתקדם
        </summary>
        <div className="grid gap-4 border-t border-brand-100 p-4 sm:grid-cols-2">
          {advancedFields.map((f) => (
            <FilterControl key={f.key} field={f} params={params} />
          ))}
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="inactive" value="1" defaultChecked={params.inactive === "1"} />
            כלול לא-פעילים
          </label>
        </div>
      </details>
    </form>
  );
}
