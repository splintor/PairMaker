"use client";
import { useEffect, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

/**
 * RTL-friendly custom dropdown. Renders a hidden input named `name` so it
 * submits with a normal <form> / server action, while giving us full control
 * over alignment and styling (native <select> popups can't be styled for RTL).
 */
export function Select({
  name,
  options,
  defaultValue = "",
  placeholder = "—",
  includeEmpty = true,
  onChange,
}: {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  includeEmpty?: boolean; // prepend an empty "—" option (default). Set false for a required, pre-selected field.
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = options.find((o) => o.value === value);
  const items: SelectOption[] = includeEmpty ? [{ value: "", label: placeholder }, ...options] : options;

  function onTriggerKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative" dir="rtl">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
        className="flex w-full items-center justify-between rounded-lg border border-brand-200 px-3 py-2.5 text-start"
      >
        <span className={selected ? "text-slate-800" : "text-slate-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-brand-200 bg-white py-1 text-start shadow-lg"
        >
          {items.map((o) => {
            const isSelected = o.value === value;
            return (
              <li key={o.value || "__empty"} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    setValue(o.value);
                    setOpen(false);
                    onChange?.(o.value);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-start hover:bg-brand-50 ${
                    isSelected ? "bg-brand-50 text-brand-700" : ""
                  } ${o.value ? "" : "text-slate-400"}`}
                >
                  <span>{o.label}</span>
                  {isSelected && <span className="text-brand-600">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
