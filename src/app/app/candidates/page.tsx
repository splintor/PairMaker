import Link from "next/link";
import { cookies } from "next/headers";
import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { CandidateCard } from "@/components/CandidateCard";
import { CandidateRow } from "@/components/CandidateRow";
import { SearchPanel } from "@/components/SearchPanel";
import { ViewToggle } from "@/components/ViewToggle";
import { LinkButton } from "@/components/ui";
import { CANDIDATE_VIEW_COOKIE, parseView } from "@/lib/view";
import {
  buildCandidateWhere,
  describeActiveFilters,
  paramsToQuery,
  type SearchParams,
} from "@/lib/candidate-search";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireMembership();
  const raw = await searchParams;

  const params: SearchParams = {};
  for (const [k, v] of Object.entries(raw)) params[k] = Array.isArray(v) ? v[0] : v;

  const view = parseView((await cookies()).get(CANDIDATE_VIEW_COOKIE)?.value);
  const where = buildCandidateWhere(params, ctx.communityId);
  const candidates = await db.candidate.findMany({ where, orderBy: { updatedAt: "desc" } });

  const chips = describeActiveFilters(params);
  // Remount SearchPanel only when advanced filters change (keep focus while typing q).
  const advancedKey = Object.entries(params)
    .filter(([k]) => k !== "q")
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("&");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-700">מועמדים</h1>
        <LinkButton href="/app/candidates/new">+ מועמד חדש</LinkButton>
      </div>

      <SearchPanel key={advancedKey} params={params} />

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => {
            const qs = paramsToQuery(params, chip.removeKeys);
            return (
              <Link
                key={chip.removeKeys.join(",")}
                href={qs ? `/app/candidates?${qs}` : "/app/candidates"}
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700 hover:bg-brand-100"
              >
                <span>{chip.label}</span>
                <span className="text-brand-400">✕</span>
              </Link>
            );
          })}
          <Link href="/app/candidates" className="text-xs text-slate-400 hover:underline">
            ניקוי הכל
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>נמצאו {candidates.length} מועמדים</span>
        <ViewToggle view={view} />
      </div>

      {candidates.length === 0 ? (
        <p className="rounded-xl2 border border-dashed border-brand-200 bg-white p-8 text-center text-slate-400">
          לא נמצאו מועמדים התואמים את החיפוש.
        </p>
      ) : view === "list" ? (
        <div className="space-y-2">
          {candidates.map((c) => (
            <CandidateRow key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((c) => (
            <CandidateCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
