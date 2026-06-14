import { notFound, redirect } from "next/navigation";
import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { canEditCandidate } from "@/lib/permissions";
import { displayAge } from "@/lib/candidate-display";
import { CandidateForm } from "@/components/CandidateForm";
import { updateCandidate } from "@/app/app/candidates/actions";

export default async function EditCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireMembership();
  const { id } = await params;
  const c = await db.candidate.findFirst({ where: { id, communityId: ctx.communityId } });
  if (!c) notFound();
  if (!canEditCandidate(ctx.role, ctx.userId, c)) redirect(`/app/candidates/${id}`);

  const values = {
    ...c,
    ...(c.details as Record<string, unknown>),
    age: displayAge(c) ?? "",
  } as Record<string, unknown>;
  const action = updateCandidate.bind(null, id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-700">עריכת מועמד</h1>
      <CandidateForm
        action={action}
        values={values as Record<string, string | number | null | undefined>}
        submitLabel="שמירה"
        cancelHref={`/app/candidates/${id}`}
      />
    </div>
  );
}
