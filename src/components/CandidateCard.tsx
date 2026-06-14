import Link from "next/link";
import type { Candidate } from "@prisma/client";
import { displayAge, ageLabel } from "@/lib/candidate-display";
import { StatusPill } from "@/components/ui";
import { CandidateAvatar } from "@/components/CandidateAvatar";

export function CandidateCard({ c }: { c: Candidate }) {
  const age = displayAge(c);
  const subtitleParts = [
    ageLabel(c.gender, age),
    c.occupation,
    c.heightCm ? `${c.heightCm} ס"מ` : null,
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
    </Link>
  );
}
