import Link from "next/link";
import type { Candidate } from "@prisma/client";
import { displayAge } from "@/lib/candidate-display";
import { StatusPill } from "@/components/ui";

export function CandidateCard({ c }: { c: Candidate }) {
  const age = displayAge(c);
  const subtitleParts = [
    age != null ? `בן/בת ${age}` : null,
    c.occupation,
    c.heightCm ? `${c.heightCm} ס"מ` : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/app/candidates/${c.id}`}
      className="block rounded-xl2 border border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100 p-4 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-lg font-bold text-white">
          {c.name.charAt(0)}
        </div>
        <div>
          <div className="font-bold text-brand-700">{c.name}</div>
          <div className="text-xs text-brand-600">{subtitleParts.join(" · ")}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusPill active={c.status === "active"} />
      </div>
    </Link>
  );
}
