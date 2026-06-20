import Link from "next/link";
import type { Suggestion, Candidate } from "@prisma/client";
import { Select } from "@/components/Select";
import {
  SUGGESTION_STATUSES,
  SUGGESTION_OUTCOMES,
  statusLabel,
  outcomeLabel,
} from "@/lib/suggestions";
import { updateSuggestion, deleteSuggestion } from "@/app/app/matches/actions";
import { DeleteSuggestionButton } from "@/components/DeleteSuggestionButton";
import { PendingButton } from "@/components/PendingButton";
import { SuggestionUpdatePanel } from "@/components/SuggestionUpdatePanel";
import { SendIntroButton } from "@/components/SendIntroButton";
import { creatorLabel, displayAge } from "@/lib/candidate-display";
import { candidatePhotoSrc } from "@/lib/photo";
import { type IntroParty } from "@/lib/intro-message";
import { relativeTimeHe } from "@/lib/relative-time";

type WithPair = Suggestion & {
  candidateA: Candidate;
  candidateB: Candidate;
  createdBy: { name: string | null; email: string | null } | null;
};

function phoneOf(c: Candidate): string | null {
  const p = (c.details as Record<string, unknown>)?.phone;
  return typeof p === "string" && p.trim() ? p.trim() : null;
}

function photoSrcOf(c: Candidate): string | null {
  return c.photoUrl ? candidatePhotoSrc(c.id, c.photoUrl) : null;
}

function introOf(c: Candidate, phone: string): IntroParty {
  return { name: c.name, gender: c.gender, age: displayAge(c), occupation: c.occupation, city: c.city, phone };
}

export function SuggestionItem({ s }: { s: WithPair }) {
  const action = updateSuggestion.bind(null, s.id);
  const removeAction = deleteSuggestion.bind(null, s.id);

  // Both CTAs require both phones: the recipient's (to open the chat) and the
  // introduced person's (included in the message so they can be contacted back).
  const phoneA = phoneOf(s.candidateA);
  const phoneB = phoneOf(s.candidateB);
  const canIntroduce = phoneA && phoneB;

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

      {s.notes && <p className="mt-2 text-sm text-slate-600">{s.notes}</p>}

      <p className="mt-2 text-xs text-slate-400">
        הוצע ע״י {creatorLabel(s.createdBy)} · {relativeTimeHe(s.createdAt)}
      </p>

      {canIntroduce && (
        <div className="mt-3 flex flex-wrap gap-2">
          <SendIntroButton
            suggestionId={s.id}
            recipientId={s.candidateAId}
            recipientName={s.candidateA.name}
            recipientGender={s.candidateA.gender}
            recipientPhone={phoneA}
            intro={introOf(s.candidateB, phoneB)}
            introPhotoSrc={photoSrcOf(s.candidateB)}
          />
          <SendIntroButton
            suggestionId={s.id}
            recipientId={s.candidateBId}
            recipientName={s.candidateB.name}
            recipientGender={s.candidateB.gender}
            recipientPhone={phoneB}
            intro={introOf(s.candidateA, phoneA)}
            introPhotoSrc={photoSrcOf(s.candidateA)}
          />
        </div>
      )}

      <SuggestionUpdatePanel action={action}>
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
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-start"
        />
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <PendingButton className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
            שמירה
          </PendingButton>
          <DeleteSuggestionButton action={removeAction} />
        </div>
      </SuggestionUpdatePanel>
    </div>
  );
}
