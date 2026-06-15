"use client";

import { useState } from "react";

const ROLES = [
  { value: "member", label: "שדכן/ית" },
  { value: "admin", label: "מנהל/ת" },
];

/**
 * Segmented role picker (שדכן/ית · מנהל/ת) replacing the role dropdown.
 * - Uncontrolled (add-member form): pass `name` + `defaultValue`; a hidden input
 *   submits the chosen role with the <form>.
 * - Controlled (per-member auto-save): pass `value` + `onChange`; the parent owns
 *   the value so a rejected change simply isn't reflected (no revert dance).
 */
export function RoleToggle({
  name,
  defaultValue = "member",
  value: controlledValue,
  onChange,
  disabled = false,
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const isControlled = controlledValue !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const value = isControlled ? controlledValue : internal;

  function select(next: string) {
    if (next === value || disabled) return;
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  return (
    <div dir="rtl">
      {name && <input type="hidden" name={name} value={value} />}
      <div className="inline-flex rounded-lg bg-slate-200 p-1">
        {ROLES.map((r) => {
          const active = r.value === value;
          return (
            <button
              key={r.value}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => select(r.value)}
              className={`rounded-md px-3 py-1.5 text-sm transition disabled:opacity-60 ${
                active
                  ? "bg-white font-semibold text-brand-700 shadow-sm"
                  : "font-medium text-slate-500 hover:text-slate-700"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
