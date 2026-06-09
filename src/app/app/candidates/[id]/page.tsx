import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { FIELDS, optionLabel, getField } from "@/lib/fields";
import { displayAge } from "@/lib/candidate-display";
import { deactivationReasonLabel } from "@/lib/constants";
import { StatusPill, Card, LinkButton } from "@/components/ui";
import { DeactivateDialog } from "@/components/DeactivateDialog";
import { DeleteCandidateButton } from "@/components/DeleteCandidateButton";
import {
  deactivateCandidate,
  reactivateCandidate,
  deleteCandidate,
} from "@/app/app/candidates/actions";

export default async function CandidateProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireMembership();
  const { id } = await params;
  const c = await db.candidate.findFirst({
    where: { id, communityId: ctx.communityId },
    include: { createdBy: true },
  });
  if (!c) notFound();

  const details = (c.details as Record<string, unknown>) ?? {};
  const age = displayAge(c);
  const detailFields = FIELDS.filter(
    (f) => f.key !== "name" && f.key !== "requirements" && f.storage === "details",
  );
  const columnFields = FIELDS.filter(
    (f) => !["name", "gender", "requirements"].includes(f.key) && f.storage === "column",
  );

  const deactivateAction = deactivateCandidate.bind(null, id);
  const reactivateAction = reactivateCandidate.bind(null, id);
  const deleteAction = deleteCandidate.bind(null, id);

  function valueFor(key: string): string {
    const field = getField(key)!;
    const raw = field.storage === "column" ? (c as Record<string, unknown>)[key] : details[key];
    if (raw == null || raw === "") return "—";
    if (field.options) return optionLabel(field, String(raw));
    return String(raw);
  }

  return (
    <div className="space-y-4">
      <Link href="/app/candidates" className="text-sm text-brand-600">→ חזרה לרשימה</Link>

      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-bold text-white">
            {c.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-brand-700">{c.name}</h1>
              <StatusPill active={c.status === "active"} />
            </div>
            <div className="text-sm text-brand-600">
              {[
                optionLabel(getField("gender")!, c.gender),
                age != null ? `גיל ${age}` : null,
                c.occupation,
              ].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div className="flex gap-2">
            <LinkButton href={`/app/candidates/${id}/edit`}>עריכה</LinkButton>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[...columnFields, ...detailFields].map((f) => (
            <div key={f.key} className="rounded-lg bg-brand-50 p-3">
              <div className="text-xs text-slate-400">{f.label}</div>
              <div className="text-sm text-slate-700">{valueFor(f.key)}</div>
            </div>
          ))}
        </div>

        {c.requirements && (
          <div className="mt-4 rounded-lg bg-brand-50 p-3">
            <div className="text-xs text-slate-400">דרישות לבן/בת הזוג</div>
            <div className="text-sm text-slate-700">{c.requirements}</div>
          </div>
        )}

        {c.status === "inactive" && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            לא פעיל/ה · סיבה: {deactivationReasonLabel(c.deactivationReason)}
            {c.deactivationNote ? ` · ${c.deactivationNote}` : ""}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-sm text-slate-400">
          <span>נוסף ע״י {c.createdBy?.name ?? c.createdBy?.email ?? "—"}</span>
          {c.status === "active" ? (
            <DeactivateDialog action={deactivateAction} />
          ) : (
            <form action={reactivateAction}>
              <button className="text-sm text-emerald-700 hover:underline">החזרה לפעילות</button>
            </form>
          )}
          <DeleteCandidateButton action={deleteAction} />
        </div>
      </Card>
    </div>
  );
}
