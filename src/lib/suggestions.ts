import type { SuggestionStatus } from "@prisma/client";

export function makePairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

export function oppositeGender(g: "male" | "female"): "male" | "female" {
  return g === "male" ? "female" : "male";
}

export const SUGGESTION_STATUSES: { value: SuggestionStatus; label: string }[] = [
  { value: "proposed", label: "הוצע" },
  { value: "accepted", label: "הסכימו" },
  { value: "meeting", label: "בפגישה" },
  { value: "closed", label: "נסגר" },
];

export const SUGGESTION_OUTCOMES: { value: string; label: string }[] = [
  { value: "engaged", label: "התארסו 🎉" },
  { value: "not_a_fit", label: "לא התאים" },
  { value: "on_hold", label: "בהמתנה" },
];

export function statusLabel(s: SuggestionStatus): string {
  return SUGGESTION_STATUSES.find((x) => x.value === s)?.label ?? s;
}

export function outcomeLabel(v: string | null | undefined): string {
  if (!v) return "";
  return SUGGESTION_OUTCOMES.find((x) => x.value === v)?.label ?? v;
}

export function statusIndex(s: SuggestionStatus): number {
  return SUGGESTION_STATUSES.findIndex((x) => x.value === s);
}
