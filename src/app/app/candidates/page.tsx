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
import { CANDIDATE_FILTER_COOKIE, parseCandidateFilter } from "@/lib/candidate-filter";
import { CandidateFilterTabs } from "@/components/CandidateFilterTabs";
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

  const cookieStore = await cookies();
  const view = parseView(cookieStore.get(CANDIDATE_VIEW_COOKIE)?.value);
  const filter = parseCandidateFilter(cookieStore.get(CANDIDATE_FILTER_COOKIE)?.value);
  const where = buildCandidateWhere(params, ctx.communityId);
  if (filter === "mine") (where.AND as object[]).push({ createdById: ctx.userId });
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
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-brand-700">מועמדים</h1>
          <div className="flex items-center gap-3">
            {/* Inline with the title on desktop; drops to its own row on mobile. */}
            <div className="hidden sm:block">
              <CandidateFilterTabs value={filter} />
            </div>
            <LinkButton href="/app/candidates/new">+ מועמד חדש</LinkButton>
          </div>
        </div>
        <div className="flex justify-end sm:hidden">
          <CandidateFilterTabs value={filter} />
        </div>
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
      ) : (
        <>
          {/* "auto": list on mobile, tiles on desktop. Explicit choice shows one everywhere. */}
          {(view === "list" || view === "auto") && (
            <div className={`space-y-2 ${view === "auto" ? "sm:hidden" : ""}`}>
              {candidates.map((c) => (
                <CandidateRow key={c.id} c={c} />
              ))}
            </div>
          )}
          {(view === "tiles" || view === "auto") && (
            <div
              className={
                view === "auto"
                  ? "hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3"
                  : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              }
            >
              {candidates.map((c) => (
                <CandidateCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
