"use client";

/**
 * Delete submit button. Uses `formAction` so it can live inside the suggestion's
 * update <form> (no nested form), keeping it on the same row as the Save button.
 */
export function DeleteSuggestionButton({ action }: { action: () => void }) {
  return (
    <button
      type="submit"
      formAction={action}
      onClick={(e) => {
        if (!confirm("למחוק את ההצעה?")) e.preventDefault();
      }}
      className="text-sm text-red-600 hover:underline"
    >
      מחיקת הצעה
    </button>
  );
}
