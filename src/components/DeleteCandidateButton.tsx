"use client";

import { PendingButton } from "@/components/PendingButton";
import { candidateNoun } from "@/lib/candidate-display";

export function DeleteCandidateButton({
  action,
  name,
  gender,
}: {
  action: () => void;
  name: string;
  gender?: "male" | "female" | null;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`למחוק את ה${candidateNoun(gender)} ${name} לצמיתות?`)) {
          e.preventDefault();
        }
      }}
    >
      <PendingButton className="text-sm text-red-600 hover:underline disabled:opacity-60">
        מחיקה
      </PendingButton>
    </form>
  );
}
