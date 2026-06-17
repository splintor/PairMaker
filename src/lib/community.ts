import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/permissions";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ACTIVE_COMMUNITY_COOKIE,
  resolveActiveCommunityId,
  type MembershipLite,
} from "@/lib/active-community";

export { ACTIVE_COMMUNITY_COOKIE };

export type ActiveContext = {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  communityId: string;
  role: Role;
  memberships: { communityId: string; communityName: string; role: Role }[];
};

/** Server-only: resolve session → active community + role. Redirects if unauthorized. */
export async function requireMembership(): Promise<ActiveContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  // Global block: bars the user from the whole app, even an existing session.
  const account = await db.user.findUnique({
    where: { id: session.user.id },
    select: { blockedAt: true },
  });
  if (account?.blockedAt) redirect("/blocked");

  const rows = await db.membership.findMany({
    where: { userId: session.user.id },
    include: { community: true, user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (rows.length === 0) redirect("/no-community");

  const lite: MembershipLite[] = rows.map((r) => ({
    communityId: r.communityId,
    role: r.role,
  }));
  const cookieValue = (await cookies()).get(ACTIVE_COMMUNITY_COOKIE)?.value;
  const communityId = resolveActiveCommunityId(lite, cookieValue)!;
  const active = rows.find((r) => r.communityId === communityId)!;

  return {
    userId: session.user.id,
    userName: rows[0].user.name ?? null,
    userEmail: rows[0].user.email ?? null,
    communityId,
    role: active.role,
    memberships: rows.map((r) => ({
      communityId: r.communityId,
      communityName: r.community.name,
      role: r.role,
    })),
  };
}
