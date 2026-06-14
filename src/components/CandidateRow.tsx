import Link from "next/link";
import type { Candidate } from "@prisma/client";
import { displayAge, ageLabel, smokingLabel, creatorLabel, addedByLabel } from "@/lib/candidate-display";
import { StatusPill } from "@/components/ui";
import { CandidateAvatar } from "@/components/CandidateAvatar";

type RowCandidate = Candidate & {
  createdBy: { name: string | null; email: string | null } | null;
};

export function CandidateRow({ c }: { c: RowCandidate }) {
  const age = displayAge(c);
  const details = (c.details as Record<string, unknown>) ?? {};
  const parts = [
    ageLabel(c.gender, age),
    c.occupation,
    c.city,
    c.heightCm ? `${c.heightCm} ס"מ` : null,
    details.smoking === true ? smokingLabel(c.gender) : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/app/candidates/${c.id}`}
      className="flex items-center gap-3 rounded-lg border border-brand-200 bg-white px-4 py-3 hover:bg-brand-50"
    >
      <CandidateAvatar id={c.id} name={c.name} photoUrl={c.photoUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-brand-700">{c.name}</div>
        <div className="truncate text-xs text-slate-500">{parts.join(" · ")}</div>
      </div>
      <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">
        {addedByLabel(c.gender)} {creatorLabel(c.createdBy)}
      </span>
      <StatusPill active={c.status === "active"} gender={c.gender} />
    </Link>
  );
}
