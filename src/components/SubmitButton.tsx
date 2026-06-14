"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that reflects the parent <form>'s pending state, so a slow
 * server action (e.g. sending a magic-link email) gives immediate feedback
 * instead of looking like nothing happened.
 */
export function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: React.ReactNode;
  pendingText: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-70`}>
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
