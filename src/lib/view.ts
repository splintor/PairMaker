export const CANDIDATE_VIEW_COOKIE = "candidate_view";

export type CandidateView = "tiles" | "list";
/** Stored preference, or "auto" when the user hasn't chosen: list on mobile, tiles on desktop. */
export type ViewPreference = CandidateView | "auto";

export function parseView(v: string | undefined): ViewPreference {
  return v === "list" || v === "tiles" ? v : "auto";
}
