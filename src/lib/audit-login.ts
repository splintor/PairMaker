import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

/** Record one "login" audit row per community the user belongs to. Never throws. */
export async function recordLogin(user: {
  id: string;
  name?: string | null;
  email?: string | null;
}): Promise<void> {
  try {
    const memberships = await db.membership.findMany({ where: { userId: user.id } });
    const label = user.name ?? user.email ?? user.id;
    for (const m of memberships) {
      await writeAudit(db, {
        communityId: m.communityId,
        entityType: "auth",
        entityId: user.id,
        entityLabel: label,
        action: "login",
        actorId: user.id,
      });
    }
  } catch (err) {
    console.error("[recordLogin] failed:", err);
  }
}
