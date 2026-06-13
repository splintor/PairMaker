"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { ACTIVE_COMMUNITY_COOKIE } from "@/lib/community";
import { setFlash } from "@/lib/flash-server";

export async function createCommunity(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();

  const expected = process.env.COMMUNITY_INVITE_CODE;
  if (!expected || code !== expected) {
    await setFlash({ type: "error", message: "קוד הזמנה שגוי" });
    redirect("/communities/new");
  }
  if (!name) {
    await setFlash({ type: "error", message: "יש להזין שם קהילה" });
    redirect("/communities/new");
  }

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
  await setFlash({ type: "success", message: "הקהילה נוצרה" });
  redirect("/app/candidates");
}
