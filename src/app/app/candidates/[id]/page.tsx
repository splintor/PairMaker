import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { FIELDS, optionLabel, getField } from "@/lib/fields";
import { displayAge, ageLabel, ageWithBirthYear, statusLabel, creatorLabel, addedByLabel, requirementsLabel, familyStatusLabel, relationLabel } from "@/lib/candidate-display";
import { canEditCandidate } from "@/lib/permissions";
import { oppositeGender } from "@/lib/suggestions";
import { deactivationReasonLabel } from "@/lib/constants";
import { StatusPill, Card, LinkButton } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";
import { EnlargeableAvatar } from "@/components/EnlargeableAvatar";
import { DeactivateDialog } from "@/components/DeactivateDialog";
import { DeleteCandidateButton } from "@/components/DeleteCandidateButton";
import { SuggestionItem } from "@/components/SuggestionItem";
import { PhoneLinks } from "@/components/PhoneLinks";
import { SocialLinks } from "@/components/SocialLinks";
import { PhotoGallery } from "@/components/PhotoGallery";
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

  const suggestions = await db.suggestion.findMany({
    where: { communityId: ctx.communityId, OR: [{ candidateAId: id }, { candidateBId: id }] },
    include: {
      candidateA: true,
      candidateB: true,
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const details = (c.details as Record<string, unknown>) ?? {};
  const age = displayAge(c);
  const ageDisplay = ageWithBirthYear(c) ?? "—";
  const canEdit = canEditCandidate(ctx.role, ctx.userId, c);
  // Registry order keeps age near the top; includes the virtual age + detail fields.
  // Social fields render as icons (SocialLinks), not as text rows.
  const SOCIAL_KEYS = ["facebook", "linkedin", "instagram", "twitter"];
  const relationEmpty = !(typeof details.relation === "string" && details.relation.trim());
  const profileFields = FIELDS.filter(
    (f) =>
      !["firstName", "lastName", "gender", "requirements", ...SOCIAL_KEYS].includes(f.key) &&
      // Skip the "how are they related to me?" row when it's empty.
      !(f.key === "relation" && relationEmpty),
  );

  const deactivateAction = deactivateCandidate.bind(null, id);
  const reactivateAction = reactivateCandidate.bind(null, id);
  const deleteAction = deleteCandidate.bind(null, id);

  function valueFor(key: string): string {
    const field = getField(key)!;
    if (field.storage === "virtual") return key === "age" ? ageDisplay : "—";
    const raw = field.storage === "column" ? (c as Record<string, unknown>)[key] : details[key];
    if (field.type === "boolean") return raw == null ? "—" : raw ? "כן" : "לא";
    if (raw == null || raw === "") return "—";
    if (key === "familyStatus") return familyStatusLabel(String(raw), c!.gender);
    if (field.options) return optionLabel(field, String(raw));
    return String(raw);
  }

  return (
    <div className="space-y-4">
      <Link href="/app/candidates" className="text-sm text-brand-600">→ חזרה לרשימה</Link>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-1 items-start gap-4">
            <EnlargeableAvatar id={c.id} name={c.name} photoUrl={c.photoUrl} photos={c.photos} />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold text-brand-700">{c.name}</h1>
                <StatusPill active={c.status === "active"} gender={c.gender} />
              </div>
              <div className="text-sm text-brand-600">
                {[ageLabel(c.gender, age), c.occupation].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {c.status === "active" && (
              <LinkButton href={`/app/candidates/${id}/suggest?gender=${oppositeGender(c.gender)}`}>
                + הצעת שידוך
              </LinkButton>
            )}
            {canEdit && <LinkButton href={`/app/candidates/${id}/edit`}>עריכה</LinkButton>}
          </div>
        </div>

        <PhotoGallery candidateId={c.id} photos={c.photos} />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {profileFields.map((f) => (
            <div key={f.key} className="rounded-lg bg-brand-50 p-3">
              <div className="text-xs text-slate-400">{f.key === "relation" ? relationLabel(c.gender) : f.label}</div>
              <div className="text-sm text-slate-700">
                {f.key === "phone" && typeof details.phone === "string" && details.phone ? (
                  <PhoneLinks phone={details.phone} />
                ) : (
                  valueFor(f.key)
                )}
              </div>
            </div>
          ))}
        </div>

        <SocialLinks links={details} />

        {c.requirements && (
          <div className="mt-4 rounded-lg bg-brand-50 p-3">
            <div className="text-xs text-slate-400">{requirementsLabel(c.gender)}</div>
            <div className="text-sm text-slate-700">{c.requirements}</div>
          </div>
        )}

        {c.status === "inactive" && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            {statusLabel(c.gender, false)} · סיבה: {deactivationReasonLabel(c.deactivationReason)}
            {c.deactivationNote ? ` · ${c.deactivationNote}` : ""}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-sm text-slate-400">
          <span>{addedByLabel(c.gender)} {creatorLabel(c.createdBy)}</span>
          {canEdit &&
            (c.status === "active" ? (
              <DeactivateDialog action={deactivateAction} gender={c.gender} />
            ) : (
              <form action={reactivateAction}>
                <button className="text-sm text-emerald-700 hover:underline">החזרה לפעילות</button>
              </form>
            ))}
          {canEdit && <DeleteCandidateButton action={deleteAction} name={c.name} gender={c.gender} />}
        </div>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-bold text-brand-700">הצעות שידוך ({suggestions.length})</h2>
        {suggestions.length === 0 ? (
          <EmptyState
            icon="💡"
            title="אין הצעות עדיין"
            action={
              c.status === "active" ? (
                <LinkButton href={`/app/candidates/${id}/suggest?gender=${oppositeGender(c.gender)}`}>
                  + הצע שידוך
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          suggestions.map((s) => <SuggestionItem key={s.id} s={s} />)
        )}
      </div>
    </div>
  );
}
