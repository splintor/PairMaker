export const SUGGESTION_FILTER_COOKIE = "suggestion_filter";

export type SuggestionFilter = "mine" | "my-candidates" | "all";

export const SUGGESTION_FILTER_OPTIONS: { value: SuggestionFilter; label: string }[] = [
  { value: "mine", label: "ההצעות שלי" },
  { value: "my-candidates", label: "הצעות למועמדים שלי" },
  { value: "all", label: "כל ההצעות" },
];

/** Default is "mine"; anything unrecognized falls back to it. */
export function parseSuggestionFilter(v: string | undefined): SuggestionFilter {
  return v === "my-candidates" || v === "all" ? v : "mine";
}
