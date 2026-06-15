"use client";

import { useState } from "react";

/**
 * Collapsible "עדכון" pane for a suggestion. Controls the <details> open state
 * so the pane collapses automatically once a save completes (the update action
 * doesn't redirect, so an uncontrolled <details> would stay open). Delete uses a
 * `formAction` override that bypasses this wrapper — the whole item disappears.
 */
export function SuggestionUpdatePanel({
  action,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="mt-2"
    >
      <summary className="cursor-pointer text-sm text-brand-600">עדכון</summary>
      <form
        action={async (formData) => {
          await action(formData);
          setOpen(false);
        }}
        className="mt-2 space-y-2"
      >
        {children}
      </form>
    </details>
  );
}
