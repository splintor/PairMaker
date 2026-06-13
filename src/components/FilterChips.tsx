import Link from "next/link";
import { describeActiveFilters, paramsToQuery, type SearchParams } from "@/lib/candidate-search";

/** Removable chips describing the active filters; each links to `basePath` with its param(s) removed. */
export function FilterChips({ params, basePath }: { params: SearchParams; basePath: string }) {
  const chips = describeActiveFilters(params);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => {
        const qs = paramsToQuery(params, chip.removeKeys);
        return (
          <Link
            key={chip.removeKeys.join(",")}
            href={qs ? `${basePath}?${qs}` : basePath}
            aria-label={`הסר סינון: ${chip.label}`}
            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700 hover:bg-brand-100"
          >
            <span>{chip.label}</span>
            <span className="text-brand-400">✕</span>
          </Link>
        );
      })}
      <Link href={basePath} className="text-xs text-slate-400 hover:underline">
        ניקוי הכל
      </Link>
    </div>
  );
}
