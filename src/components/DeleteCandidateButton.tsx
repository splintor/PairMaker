"use client";

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
      <button className="text-sm text-red-600 hover:underline">מחיקה</button>
    </form>
  );
}
