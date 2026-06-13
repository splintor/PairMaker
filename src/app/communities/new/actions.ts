"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { ACTIVE_COMMUNITY_COOKIE } from "@/lib/community";

export async function createCommunity(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();

  const expected = process.env.COMMUNITY_INVITE_CODE;
  if (!expected || code !== expected) redirect("/communities/new?error=code");
  if (!name) redirect("/communities/new?error=name");

  const community = await db.$transaction(async (tx) => {
    const c = await tx.community.create({ data: { name } });
    await tx.membership.create({
      data: { userId: session.user.id, communityId: c.id, role: "admin" },
    });
    await writeAudit(tx, {
      communityId: c.id,
      entityType: "community",
      entityId: c.id,
      entityLabel: name,
      action: "create",
      actorId: session.user.id,
    });
    return c;
  });

  // Make the new community active.
  (await cookies()).set(ACTIVE_COMMUNITY_COOKIE, community.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/app");
  redirect("/app/candidates");
}
