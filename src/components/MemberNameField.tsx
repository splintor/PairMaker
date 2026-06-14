"use client";

import { useRef, useState } from "react";
import { setMemberName } from "@/app/app/settings/actions";

const SAVE_DELAY_MS = 1200;

/**
 * Auto-saving member-name input. Debounces typing and persists via the
 * setMemberName server action (which does not redirect), so the name saves
 * a second or so after the admin stops typing — no button, no page reload.
 */
export function MemberNameField({
  membershipId,
  defaultName,
}: {
  membershipId: string;
  defaultName: string;
}) {
  const [value, setValue] = useState(defaultName);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(defaultName);

  async function save(next: string) {
    const name = next.trim();
    if (!name || name === lastSaved.current.trim()) {
      setStatus("idle");
      return;
    }
    setStatus("saving");
    try {
      await setMemberName(membershipId, name);
      lastSaved.current = name;
      setStatus("saved");
    } catch {
      setStatus("idle");
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    setStatus("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(next), SAVE_DELAY_MS);
  }

  function flush() {
    if (timer.current) clearTimeout(timer.current);
    void save(value);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        name="name"
        type="text"
        dir="rtl"
        value={value}
        onChange={onChange}
        onBlur={flush}
        placeholder="שם מלא"
        className="w-44 rounded-lg border border-brand-200 px-3 py-1.5 text-start text-sm"
      />
      <span className="min-w-[3.5rem] text-xs text-slate-400">
        {status === "saving" ? "שומר…" : status === "saved" ? "נשמר ✓" : ""}
      </span>
    </div>
  );
}
