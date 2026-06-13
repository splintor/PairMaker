"use client";

export function DeleteSuggestionButton({ action }: { action: () => void }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("למחוק את ההצעה?")) e.preventDefault();
      }}
    >
      <button className="text-sm text-red-600 hover:underline">מחיקת הצעה</button>
    </form>
  );
}
