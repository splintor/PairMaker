"use client";

import { useFormStatus } from "react-dom";

export function PendingButton({
  children,
  className = "rounded-lg bg-brand-500 px-4 py-2.5 font-medium text-white hover:bg-brand-600 disabled:opacity-60",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
