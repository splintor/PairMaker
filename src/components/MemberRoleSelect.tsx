"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/Select";
import { changeMemberRole } from "@/app/app/settings/actions";

const ROLE_OPTIONS = [
  { value: "member", label: "חבר/ה" },
  { value: "admin", label: "מנהל/ת" },
];

/**
 * Role dropdown that saves on change (no button, no reload). On a rejected
 * change (e.g. demoting the last admin) it reverts the dropdown and toasts the
 * error. The `key` bump forces the uncontrolled Select to remount at the old value.
 */
export function MemberRoleSelect({
  membershipId,
  defaultRole,
}: {
  membershipId: string;
  defaultRole: string;
}) {
  const [role, setRole] = useState(defaultRole);
  const [selectKey, setSelectKey] = useState(0);
  const [saving, setSaving] = useState(false);

  async function onChange(next: string) {
    if (next === role || saving) return;
    setSaving(true);
    try {
      const res = await changeMemberRole(membershipId, next);
      if (res.ok) {
        setRole(next);
        toast.success("התפקיד עודכן");
      } else {
        setSelectKey((k) => k + 1);
        toast.error(res.error);
      }
    } catch {
      setSelectKey((k) => k + 1);
      toast.error("עדכון התפקיד נכשל");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-32">
      <Select key={selectKey} name="role" options={ROLE_OPTIONS} defaultValue={role} onChange={onChange} />
    </div>
  );
}
