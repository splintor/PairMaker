import { redirect } from "next/navigation";
import { requireMembership, type ActiveContext } from "@/lib/community";
import { can, type Action } from "@/lib/permissions";

/** Resolve membership and require a capability; redirect non-authorized users. */
export async function requireCapability(action: Action): Promise<ActiveContext> {
  const ctx = await requireMembership();
  if (!can(ctx.role, action)) redirect("/app/candidates");
  return ctx;
}
