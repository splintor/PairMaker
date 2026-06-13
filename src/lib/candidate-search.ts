import type { Prisma } from "@prisma/client";
import { SEARCHABLE_FIELDS, optionLabel } from "@/lib/fields";

export type SearchParams = Record<string, string | undefined>;

/** Build a Prisma where clause from URL search params. All filters optional. */
export function buildCandidateWhere(
  params: SearchParams,
  communityId: string,
): Prisma.CandidateWhereInput {
  const and: Prisma.CandidateWhereInput[] = [{ communityId }];

  if (params.inactive !== "1") and.push({ status: "active" });

  const q = params.q?.trim();
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { occupation: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  for (const f of SEARCHABLE_FIELDS) {
    if (f.key === "name") continue; // covered by quick search

    if (f.type === "number") {
      const range: { gte?: number; lte?: number } = {};
      const min = Number(params[`${f.key}Min`]);
      const max = Number(params[`${f.key}Max`]);
      if (params[`${f.key}Min`] && Number.isFinite(min)) range.gte = min;
      if (params[`${f.key}Max`] && Number.isFinite(max)) range.lte = max;
      if (Object.keys(range).length && f.storage === "column") {
        and.push({ [f.key]: range } as Prisma.CandidateWhereInput);
      }
    } else if (f.type === "select") {
      const v = params[f.key]?.trim();
      if (v) {
        if (f.storage === "column") and.push({ [f.key]: v } as Prisma.CandidateWhereInput);
        else and.push({ details: { path: [f.key], equals: v } });
      }
    } else if (f.type === "text") {
      const v = params[f.key]?.trim();
      if (v) {
        if (f.storage === "column") {
          and.push({ [f.key]: { contains: v, mode: "insensitive" } } as Prisma.CandidateWhereInput);
        } else {
          and.push({ details: { path: [f.key], string_contains: v } });
        }
      }
    }
  }

  return { AND: and };
}

/** True when any real filter (beyond status) is active — used to show a "clear" affordance. */
export function hasActiveFilters(params: SearchParams): boolean {
  return Object.entries(params).some(
    ([k, v]) => k !== "inactive" && typeof v === "string" && v.trim() !== "",
  );
}

export type FilterChip = { removeKeys: string[]; label: string };

/** Human-readable chips for the active filters (what is currently being searched). */
export function describeActiveFilters(params: SearchParams): FilterChip[] {
  const chips: FilterChip[] = [];

  const q = params.q?.trim();
  if (q) chips.push({ removeKeys: ["q"], label: `חיפוש: ${q}` });

  for (const f of SEARCHABLE_FIELDS) {
    if (f.key === "name") continue;
    if (f.type === "number") {
      const min = params[`${f.key}Min`]?.trim();
      const max = params[`${f.key}Max`]?.trim();
      if (min || max) {
        const range = min && max ? `${min}–${max}` : min ? `מ-${min}` : `עד ${max}`;
        chips.push({ removeKeys: [`${f.key}Min`, `${f.key}Max`], label: `${f.label}: ${range}` });
      }
    } else {
      const v = params[f.key]?.trim();
      if (v) {
        const display = f.options ? optionLabel(f, v) : v;
        chips.push({ removeKeys: [f.key], label: `${f.label}: ${display}` });
      }
    }
  }

  if (params.inactive === "1") chips.push({ removeKeys: ["inactive"], label: "כולל לא-פעילים" });

  return chips;
}

/** Serialize params back to a query string, omitting given keys and empty values. */
export function paramsToQuery(params: SearchParams, omit: string[] = []): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (omit.includes(k)) continue;
    if (typeof v === "string" && v.trim()) usp.set(k, v);
  }
  return usp.toString();
}
