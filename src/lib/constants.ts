export const DEACTIVATION_REASONS: { value: string; label: string }[] = [
  { value: "found_match", label: "מצא/ה זיווג" },
  { value: "on_break", label: "בהפסקה" },
  { value: "left", label: "עזב/ה את הקהילה" },
  { value: "other", label: "אחר" },
];

export function deactivationReasonLabel(value: string | null | undefined): string {
  if (!value) return "";
  return DEACTIVATION_REASONS.find((r) => r.value === value)?.label ?? value;
}
