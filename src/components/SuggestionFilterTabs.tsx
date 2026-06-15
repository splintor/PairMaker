"use client";

import { useRouter } from "next/navigation";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { SUGGESTION_FILTER_COOKIE, SUGGESTION_FILTER_OPTIONS, type SuggestionFilter } from "@/lib/suggestion-filter";

/** Remembered (cookie) filter above the suggestions list. */
export function SuggestionFilterTabs({ value }: { value: SuggestionFilter }) {
  const router = useRouter();
  function set(v: string) {
    document.cookie = `${SUGGESTION_FILTER_COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }
  return <SegmentedToggle options={SUGGESTION_FILTER_OPTIONS} value={value} onChange={set} />;
}
