import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { CandidateForm } from "@/components/CandidateForm";
import { updateCandidate } from "@/app/app/candidates/actions";

export default async function EditCandidatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requireMembership();
  const { id } = await params;
  const { error } = await searchParams;
  const c = await db.candidate.findFirst({ where: { id, communityId: ctx.communityId } });
  if (!c) notFound();

  const values = { ...c, ...(c.details as Record<string, unknown>) } as Record<string, unknown>;
  const action = updateCandidate.bind(null, id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-700">עריכת מועמד</h1>
      <CandidateForm
        action={action}
        values={values as Record<string, string | number | null | undefined>}
        submitLabel="שמירה"
        cancelHref={`/app/candidates/${id}`}
        hasError={error === "validation"}
      />
    </div>
  );
}
