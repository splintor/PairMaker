import type { Prisma } from "@prisma/client";
import { SEARCHABLE_FIELDS } from "@/lib/fields";

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
