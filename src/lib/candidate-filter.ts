export const CANDIDATE_FILTER_COOKIE = "candidate_filter";

export type CandidateFilter = "mine" | "all";

export const CANDIDATE_FILTER_OPTIONS: { value: CandidateFilter; label: string }[] = [
  { value: "mine", label: "המועמדים שלי" },
  { value: "all", label: "כל המועמדים" },
];

/** Default is "all"; anything but "mine" falls back to it. */
export function parseCandidateFilter(v: string | undefined): CandidateFilter {
  return v === "mine" ? "mine" : "all";
}
