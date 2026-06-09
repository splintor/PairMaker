import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { CandidateCard } from "@/components/CandidateCard";
import { LinkButton } from "@/components/ui";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ inactive?: string }>;
}) {
  const ctx = await requireMembership();
  const { inactive } = await searchParams;
  const showInactive = inactive === "1";

  const candidates = await db.candidate.findMany({
    where: {
      communityId: ctx.communityId,
      ...(showInactive ? {} : { status: "active" }),
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-700">מועמדים ({candidates.length})</h1>
        <LinkButton href="/app/candidates/new">+ מועמד חדש</LinkButton>
      </div>
      {candidates.length === 0 ? (
        <p className="rounded-xl2 border border-dashed border-brand-200 bg-white p-8 text-center text-slate-400">
          אין מועמדים עדיין. הוסיפו מועמד ראשון.
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
