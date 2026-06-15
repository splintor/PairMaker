"use client";

import { useState } from "react";

export type ToggleOption = { value: string; label: string };

/**
 * Generic segmented control (a small row of mutually-exclusive buttons).
 * - Uncontrolled: pass `name` + `defaultValue`; a hidden input submits the value.
 * - Controlled: pass `value` + `onChange`; the parent owns the value.
 * Each option is an outlined button so the control reads as a clickable choice
 * even when nothing is selected yet; the active option fills with the brand color.
 */
export function SegmentedToggle({
  name,
  options,
  defaultValue = "",
  value: controlledValue,
  onChange,
  disabled = false,
  className = "",
}: {
  name?: string;
  options: ToggleOption[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
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
    <div dir="rtl" className={className}>
      {name && <input type="hidden" name={name} value={value} />}
      <div className="inline-flex overflow-hidden rounded-lg border border-brand-300">
        {options.map((o, i) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => select(o.value)}
              className={`px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
                i > 0 ? "border-s border-brand-300" : ""
              } ${
                active
                  ? "bg-brand-500 text-white"
                  : "bg-white text-slate-700 hover:bg-brand-50"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
