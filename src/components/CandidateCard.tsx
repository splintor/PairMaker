import Link from "next/link";
import type { Candidate } from "@prisma/client";
import { displayAge, ageLabel, smokingLabel, creatorLabel, addedByLabel } from "@/lib/candidate-display";
import { CandidateAvatar } from "@/components/CandidateAvatar";

type CardCandidate = Candidate & {
  createdBy: { name: string | null; email: string | null } | null;
};

export function CandidateCard({ c }: { c: CardCandidate }) {
  const age = displayAge(c);
  const details = (c.details as Record<string, unknown>) ?? {};
  const subtitleParts = [
    ageLabel(c.gender, age),
    c.occupation,
    c.heightCm ? `${c.heightCm} ס"מ` : null,
    details.smoking === true ? smokingLabel(c.gender) : null,
  ].filter(Boolean);

  const inactive = c.status !== "active";

  return (
    <Link
      href={`/app/candidates/${c.id}`}
      className={`block rounded-xl2 border p-4 hover:shadow-sm ${
        inactive
          ? "border-slate-200 bg-slate-100"
          : "border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <CandidateAvatar id={c.id} name={c.name} photoUrl={c.photoUrl} size="md" />
        <div>
          <div className="font-bold text-brand-700">{c.name}</div>
          <div className="text-xs text-brand-600">{subtitleParts.join(" · ")}</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-slate-400">{addedByLabel(c.gender)} {creatorLabel(c.createdBy)}</div>
    </Link>
  );
}
