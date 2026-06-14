import Link from "next/link";
import type { Candidate } from "@prisma/client";
import { displayAge, ageLabel, smokingLabel, creatorLabel } from "@/lib/candidate-display";
import { StatusPill } from "@/components/ui";
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

  return (
    <Link
      href={`/app/candidates/${c.id}`}
      className="block rounded-xl2 border border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100 p-4 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <CandidateAvatar id={c.id} name={c.name} photoUrl={c.photoUrl} size="md" />
        <div>
          <div className="font-bold text-brand-700">{c.name}</div>
          <div className="text-xs text-brand-600">{subtitleParts.join(" · ")}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusPill active={c.status === "active"} gender={c.gender} />
      </div>
      <div className="mt-2 text-xs text-slate-400">נוסף ע״י {creatorLabel(c.createdBy)}</div>
    </Link>
  );
}
