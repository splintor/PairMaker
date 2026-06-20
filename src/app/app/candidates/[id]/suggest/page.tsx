import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { SearchPanel } from "@/components/SearchPanel";
import { FilterChips } from "@/components/FilterChips";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/ui";
import { PendingButton } from "@/components/PendingButton";
import { SendToMemberButton } from "@/components/SendToMemberButton";
import { CandidateAvatar } from "@/components/CandidateAvatar";
import { buildCandidateWhere, type SearchParams } from "@/lib/candidate-search";
import { displayAge, ageLabel, creatorLabel } from "@/lib/candidate-display";
import { originFromHeaders } from "@/lib/request-url";
import { createSuggestion } from "@/app/app/matches/actions";

export default async function SuggestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireMembership();
  const { id } = await params;
  const raw = await searchParams;

  const source = await db.candidate.findFirst({ where: { id, communityId: ctx.communityId } });
  if (!source) notFound();

  const sp: SearchParams = {};
  for (const [k, v] of Object.entries(raw)) sp[k] = Array.isArray(v) ? v[0] : v;
  // Gender is seeded to the opposite gender via the link from the profile, so
  // it shows as a normal removable chip (clear it to search all genders).
  const advancedKey = Object.entries(sp)
    .filter(([k]) => k !== "q")
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("&");

  // Exclude self + already-suggested partners.
  const existing = await db.suggestion.findMany({
    where: { communityId: ctx.communityId, OR: [{ candidateAId: id }, { candidateBId: id }] },
  });
  const excluded = [id, ...existing.map((s) => (s.candidateAId === id ? s.candidateBId : s.candidateAId))];

  const where = buildCandidateWhere(sp, ctx.communityId);
  (where.AND as object[]).push({ id: { notIn: excluded } });
  const matches = await db.candidate.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { createdBy: { select: { id: true, name: true, email: true, phone: true } } },
  });

  // Absolute link to the source candidate, shared in the "send to member" message.
  const sourceUrl = `${originFromHeaders(await headers())}/app/candidates/${id}`;

  return (
    <div className="space-y-4">
      <Link href={`/app/candidates/${id}`} className="text-sm text-brand-600">→ חזרה לפרופיל</Link>
      <h1 className="text-xl font-bold text-brand-700">הצעת שידוך עבור {source.name}</h1>

      <SearchPanel key={advancedKey} params={sp} />

      <FilterChips params={sp} basePath={`/app/candidates/${id}/suggest`} />

      <div className="text-sm text-slate-500">{matches.length} מועמדים אפשריים</div>

      {matches.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="אין מועמדים מתאימים"
          hint="אולי כולם כבר הוצעו — נסו לנקות את הסינון"
          action={<LinkButton href={`/app/candidates/${id}/suggest`}>נקה סינון</LinkButton>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((m) => {
            const suggest = createSuggestion.bind(null, id, m.id);
            const age = displayAge(m);
            // Offer to message the member who added this candidate — unless that's
            // the current user, or they have no phone on file.
            const creator = m.createdBy;
            const showSendToMember = creator && creator.id !== ctx.userId && creator.phone;
            return (
              <div key={m.id} className="flex items-center justify-between rounded-xl2 border border-brand-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <CandidateAvatar id={m.id} name={m.name} photoUrl={m.photoUrl} size="md" />
                  <div>
                    <Link href={`/app/candidates/${m.id}`} className="font-bold text-brand-700 hover:underline">
                      {m.name}
                    </Link>
                    <div className="text-xs text-brand-600">
                      {[
                        [ageLabel(m.gender, age), m.city ? `מ${m.city}` : ""].filter(Boolean).join(" "),
                        m.occupation,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {showSendToMember && (
                    <SendToMemberButton
                      memberId={creator.id}
                      sourceCandidateId={id}
                      creatorName={creatorLabel(creator)}
                      creatorPhone={creator.phone!}
                      theirCandidate={m.name}
                      myCandidate={source.name}
                      myCandidateUrl={sourceUrl}
                    />
                  )}
                  <form action={suggest}>
                    <PendingButton className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
                      הצע
                    </PendingButton>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
