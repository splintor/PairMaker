import { cookies } from "next/headers";
import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { CandidateCard } from "@/components/CandidateCard";
import { CandidateRow } from "@/components/CandidateRow";
import { SearchPanel } from "@/components/SearchPanel";
import { ViewToggle } from "@/components/ViewToggle";
import { FilterChips } from "@/components/FilterChips";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/ui";
import { CANDIDATE_VIEW_COOKIE, parseView } from "@/lib/view";
import { buildCandidateWhere, type SearchParams } from "@/lib/candidate-search";

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
  const candidates = await db.candidate.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });

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

      <FilterChips params={params} basePath="/app/candidates" />

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>נמצאו {candidates.length} מועמדים</span>
        <ViewToggle view={view} />
      </div>

      {candidates.length === 0 ? (
        Object.keys(params).length > 0 ? (
          <EmptyState
            icon="🔍"
            title="לא נמצאו מועמדים התואמים את החיפוש"
            action={<LinkButton href="/app/candidates">נקה סינון</LinkButton>}
          />
        ) : (
          <EmptyState
            icon="👤"
            title="אין עדיין מועמדים"
            hint="הוסף את המועמד הראשון כדי להתחיל"
            action={<LinkButton href="/app/candidates/new">+ הוסף מועמד</LinkButton>}
          />
        )
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
