import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { SuggestionItem } from "@/components/SuggestionItem";
import { SUGGESTION_STATUSES } from "@/lib/suggestions";

export default async function MatchesPage() {
  const ctx = await requireMembership();
  const suggestions = await db.suggestion.findMany({
    where: { communityId: ctx.communityId },
    include: { candidateA: true, candidateB: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-brand-700">שידוכים ({suggestions.length})</h1>
      {suggestions.length === 0 && (
        <p className="rounded-xl2 border border-dashed border-brand-200 bg-white p-8 text-center text-slate-400">
          אין הצעות שידוך עדיין. הציעו שידוך מתוך פרופיל מועמד.
        </p>
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
