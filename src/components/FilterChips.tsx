import Link from "next/link";
import { describeActiveFilters, paramsToQuery, type SearchParams } from "@/lib/candidate-search";

/**
 * Removable chips describing the active filters. Each chip links to `basePath`
 * with its own param(s) removed; `exclude` hides chips for given param keys
 * (e.g. the fixed opposite-gender context on the suggest page).
 */
export function FilterChips({
  params,
  basePath,
  exclude = [],
}: {
  params: SearchParams;
  basePath: string;
  exclude?: string[];
}) {
  const chips = describeActiveFilters(params).filter(
    (c) => !c.removeKeys.some((k) => exclude.includes(k)),
  );
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => {
        const qs = paramsToQuery(params, chip.removeKeys);
        return (
          <Link
            key={chip.removeKeys.join(",")}
            href={qs ? `${basePath}?${qs}` : basePath}
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
