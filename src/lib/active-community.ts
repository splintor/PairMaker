import type { Role } from "@/lib/permissions";

export const ACTIVE_COMMUNITY_COOKIE = "active_community";

export type MembershipLite = { communityId: string; role: Role };

/** Pure: choose the active community id from memberships + cookie value. */
export function resolveActiveCommunityId(
  memberships: MembershipLite[],
  cookieValue: string | undefined,
): string | null {
  if (memberships.length === 0) return null;
  if (cookieValue && memberships.some((m) => m.communityId === cookieValue)) {
    return cookieValue;
  }
  return memberships[0].communityId;
}
