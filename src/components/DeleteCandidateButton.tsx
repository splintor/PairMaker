"use client";

import { PendingButton } from "@/components/PendingButton";

export function DeleteCandidateButton({ action }: { action: () => void }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("למחוק את המועמד/ת לצמיתות?")) {
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
