"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RoleToggle } from "@/components/RoleToggle";
import { changeMemberRole } from "@/app/app/settings/actions";

/**
 * Role toggle that saves on change (no button, no reload). The value is owned
 * here, so a rejected change (e.g. demoting the last admin) simply leaves the
 * toggle on the old role and toasts the error.
 */
export function MemberRoleSelect({
  membershipId,
  defaultRole,
}: {
  membershipId: string;
  defaultRole: string;
}) {
  const [role, setRole] = useState(defaultRole);
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
        toast.error(res.error);
      }
    } catch {
      toast.error("עדכון התפקיד נכשל");
    } finally {
      setSaving(false);
    }
  }

  return <RoleToggle value={role} onChange={onChange} disabled={saving} />;
}
