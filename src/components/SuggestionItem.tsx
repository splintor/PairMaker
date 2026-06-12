import Link from "next/link";
import type { Suggestion, Candidate } from "@prisma/client";
import { Select } from "@/components/Select";
import {
  SUGGESTION_STATUSES,
  SUGGESTION_OUTCOMES,
  statusLabel,
  outcomeLabel,
  statusIndex,
} from "@/lib/suggestions";
import { updateSuggestion } from "@/app/app/matches/actions";

type WithPair = Suggestion & { candidateA: Candidate; candidateB: Candidate };

export function SuggestionItem({ s }: { s: WithPair }) {
  const action = updateSuggestion.bind(null, s.id);
  const current = statusIndex(s.status);

  return (
    <div id={s.id} className="rounded-xl2 border border-brand-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="font-medium text-slate-800">
          <Link href={`/app/candidates/${s.candidateAId}`} className="text-brand-700 hover:underline">
            {s.candidateA.name}
          </Link>
          {" ↔ "}
          <Link href={`/app/candidates/${s.candidateBId}`} className="text-brand-700 hover:underline">
            {s.candidateB.name}
          </Link>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
          {statusLabel(s.status)}
          {s.status === "closed" && s.outcome ? ` · ${outcomeLabel(s.outcome)}` : ""}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1 text-xs">
        {SUGGESTION_STATUSES.map((st, i) => (
          <span key={st.value} className={i <= current ? "font-bold text-brand-700" : "text-slate-400"}>
            {st.label}
            {i < SUGGESTION_STATUSES.length - 1 ? " ▸ " : ""}
          </span>
        ))}
      </div>

      {s.notes && <p className="mt-2 text-sm text-slate-600">{s.notes}</p>}

      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-brand-600">עדכון</summary>
        <form action={action} className="mt-2 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-sm text-slate-600">
              שלב
              <div className="mt-1">
                <Select name="status" options={SUGGESTION_STATUSES} defaultValue={s.status} />
              </div>
            </label>
            <label className="block text-sm text-slate-600">
              תוצאה (בסגירה)
              <div className="mt-1">
                <Select name="outcome" options={SUGGESTION_OUTCOMES} defaultValue={s.outcome ?? ""} placeholder="—" />
              </div>
            </label>
          </div>
          <textarea
            name="notes"
            dir="rtl"
            rows={2}
            defaultValue={s.notes ?? ""}
            placeholder="הערות"
            className="w-full rounded-lg border border-brand-200 px-3 py-2 text-right"
          />
          <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            שמירה
          </button>
        </form>
      </details>
    </div>
  );
}
