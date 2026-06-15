"use client";

import { SegmentedToggle } from "@/components/SegmentedToggle";

const ROLES = [
  { value: "member", label: "שדכן/ית" },
  { value: "admin", label: "מנהל/ת" },
];

/**
 * Role picker (שדכן/ית · מנהל/ת) — a thin wrapper over {@link SegmentedToggle}.
 * Uncontrolled in the add-member form (`name` + `defaultValue`), controlled in
 * the per-member auto-save row (`value` + `onChange`).
 */
export function RoleToggle({
  defaultValue = "member",
  ...props
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return <SegmentedToggle options={ROLES} defaultValue={defaultValue} {...props} />;
}
