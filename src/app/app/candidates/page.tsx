import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { CandidateCard } from "@/components/CandidateCard";
import { SearchPanel } from "@/components/SearchPanel";
import { LinkButton } from "@/components/ui";
import {
  buildCandidateWhere,
  hasActiveFilters,
  type SearchParams,
} from "@/lib/candidate-search";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireMembership();
  const raw = await searchParams;

  // Normalize to single strings (forms submit single values).
  const params: SearchParams = {};
  for (const [k, v] of Object.entries(raw)) params[k] = Array.isArray(v) ? v[0] : v;

  const where = buildCandidateWhere(params, ctx.communityId);
  const candidates = await db.candidate.findMany({ where, orderBy: { updatedAt: "desc" } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-700">מועמדים</h1>
        <LinkButton href="/app/candidates/new">+ מועמד חדש</LinkButton>
      </div>

      <SearchPanel params={params} />

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>נמצאו {candidates.length} מועמדים</span>
        {hasActiveFilters(params) && (
          <a href="/app/candidates" className="text-brand-600 hover:underline">
            ניקוי סינון
          </a>
        )}
      </div>

      {candidates.length === 0 ? (
        <p className="rounded-xl2 border border-dashed border-brand-200 bg-white p-8 text-center text-slate-400">
          לא נמצאו מועמדים התואמים את החיפוש.
        </p>
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
