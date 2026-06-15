"use client";

import { useRouter } from "next/navigation";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { CANDIDATE_FILTER_COOKIE, CANDIDATE_FILTER_OPTIONS, type CandidateFilter } from "@/lib/candidate-filter";

/** Remembered (cookie) filter on the candidates list: my candidates / all. */
export function CandidateFilterTabs({ value }: { value: CandidateFilter }) {
  const router = useRouter();
  function set(v: string) {
    document.cookie = `${CANDIDATE_FILTER_COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }
  return <SegmentedToggle options={CANDIDATE_FILTER_OPTIONS} value={value} onChange={set} />;
}
