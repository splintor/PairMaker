import { cookies } from "next/headers";
import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { SuggestionItem } from "@/components/SuggestionItem";
import { SuggestionFilterTabs } from "@/components/SuggestionFilterTabs";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/ui";
import { SUGGESTION_STATUSES } from "@/lib/suggestions";
import { SUGGESTION_FILTER_COOKIE, parseSuggestionFilter } from "@/lib/suggestion-filter";

export default async function MatchesPage() {
  const ctx = await requireMembership();
  const filter = parseSuggestionFilter((await cookies()).get(SUGGESTION_FILTER_COOKIE)?.value);

  const where = {
    communityId: ctx.communityId,
    ...(filter === "mine" ? { createdById: ctx.userId } : {}),
    ...(filter === "my-candidates"
      ? { OR: [{ candidateA: { createdById: ctx.userId } }, { candidateB: { createdById: ctx.userId } }] }
      : {}),
  };
  const suggestions = await db.suggestion.findMany({
    where,
    include: {
      candidateA: true,
      candidateB: true,
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-brand-700">שידוכים ({suggestions.length})</h1>
        <SuggestionFilterTabs value={filter} />
      </div>
      {suggestions.length === 0 && (
        <EmptyState
          icon="💞"
          title="אין הצעות שידוך עדיין"
          hint="הציעו שידוך מתוך פרופיל מועמד"
          action={<LinkButton href="/app/candidates">עבור למועמדים</LinkButton>}
        />
      )}
      {SUGGESTION_STATUSES.map((st) => {
        const group = suggestions.filter((s) => s.status === st.value);
        if (group.length === 0) return null;
        return (
          <section key={st.value} className="space-y-2">
            <h2 className="text-sm font-bold text-slate-500">
              {st.label} ({group.length})
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {group.map((s) => (
                <SuggestionItem key={s.id} s={s} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
