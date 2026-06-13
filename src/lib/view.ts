export const CANDIDATE_VIEW_COOKIE = "candidate_view";

export type CandidateView = "tiles" | "list";

export function parseView(v: string | undefined): CandidateView {
  return v === "list" ? "list" : "tiles";
}
