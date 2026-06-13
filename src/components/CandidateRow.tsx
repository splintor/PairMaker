import Link from "next/link";
import type { Candidate } from "@prisma/client";
import { displayAge, ageLabel } from "@/lib/candidate-display";
import { StatusPill } from "@/components/ui";

export function CandidateRow({ c }: { c: Candidate }) {
  const age = displayAge(c);
  const parts = [
    ageLabel(c.gender, age),
    c.occupation,
    c.city,
    c.heightCm ? `${c.heightCm} ס"מ` : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/app/candidates/${c.id}`}
      className="flex items-center gap-3 rounded-lg border border-brand-200 bg-white px-4 py-3 hover:bg-brand-50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">
        {c.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-brand-700">{c.name}</div>
        <div className="truncate text-xs text-slate-500">{parts.join(" · ")}</div>
      </div>
      <StatusPill active={c.status === "active"} />
    </Link>
  );
}
