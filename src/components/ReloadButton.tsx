"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-runs the server component for the current route (re-fetching its data)
 * without a full page reload, preserving the URL and its filters.
 */
export function ReloadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
    >
      <span className={pending ? "inline-block animate-spin" : "inline-block"}>🔄</span>
      {pending ? "מרענן…" : "רענון"}
    </button>
  );
}
