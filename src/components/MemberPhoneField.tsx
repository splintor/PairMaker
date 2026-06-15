"use client";

import { useRef, useState } from "react";
import { setMemberPhone } from "@/app/app/settings/actions";

const SAVE_DELAY_MS = 1200;

/**
 * Auto-saving member-phone input. Debounces typing and persists via the
 * setMemberPhone server action (no redirect). Unlike the name, the phone is
 * optional — clearing it saves an empty value.
 */
export function MemberPhoneField({
  membershipId,
  defaultPhone,
}: {
  membershipId: string;
  defaultPhone: string;
}) {
  const [value, setValue] = useState(defaultPhone);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(defaultPhone);

  async function save(next: string) {
    const phone = next.trim();
    if (phone === lastSaved.current.trim()) {
      setStatus("idle");
      return;
    }
    setStatus("saving");
    try {
      await setMemberPhone(membershipId, phone);
      lastSaved.current = phone;
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
        name="phone"
        type="tel"
        dir="ltr"
        value={value}
        onChange={onChange}
        onBlur={flush}
        placeholder="טלפון"
        className="w-36 rounded-lg border border-brand-200 px-3 py-1.5 text-start text-sm"
      />
      <span className="min-w-[3.5rem] text-xs text-slate-400">
        {status === "saving" ? "שומר…" : status === "saved" ? "נשמר ✓" : ""}
      </span>
    </div>
  );
}
