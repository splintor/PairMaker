"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma, type SuggestionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/community";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { computeChanges } from "@/lib/audit-diff";
import { makePairKey } from "@/lib/suggestions";

export async function createSuggestion(candidateAId: string, candidateBId: string) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "suggestion:manage")) throw new Error("forbidden");

  const [a, b] = await Promise.all([
    db.candidate.findFirst({ where: { id: candidateAId, communityId: ctx.communityId } }),
    db.candidate.findFirst({ where: { id: candidateBId, communityId: ctx.communityId } }),
  ]);
  if (!a || !b) redirect("/app/candidates");
  if (a.gender === b.gender) throw new Error("candidates must be opposite gender");

  const pairKey = makePairKey(a.id, b.id);
  const existing = await db.suggestion.findFirst({
    where: { communityId: ctx.communityId, pairKey },
  });
  if (existing) redirect(`/app/matches#${existing.id}`);

  try {
    await db.$transaction(async (tx) => {
      const s = await tx.suggestion.create({
        data: {
          communityId: ctx.communityId,
          candidateAId: a.id,
          candidateBId: b.id,
          pairKey,
          createdById: ctx.userId,
        },
      });
      await writeAudit(tx, {
        communityId: ctx.communityId,
        entityType: "suggestion",
        entityId: s.id,
        entityLabel: `${a.name} ↔ ${b.name}`,
        action: "create",
        actorId: ctx.userId,
      });
    });
  } catch (e) {
    // Unique pairKey violation (race) — treat as already-suggested.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      redirect("/app/matches");
    }
    throw e;
  }

  revalidatePath(`/app/candidates/${a.id}`);
  revalidatePath(`/app/candidates/${b.id}`);
  revalidatePath("/app/matches");
  redirect(`/app/candidates/${candidateAId}`);
}

export async function updateSuggestion(id: string, formData: FormData) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "suggestion:manage")) throw new Error("forbidden");

  const existing = await db.suggestion.findFirst({
    where: { id, communityId: ctx.communityId },
    include: { candidateA: true, candidateB: true },
  });
  if (!existing) redirect("/app/matches");

  const status = String(formData.get("status") ?? existing.status) as SuggestionStatus;
  const outcomeRaw = String(formData.get("outcome") ?? "").trim();
  const outcome = status === "closed" ? outcomeRaw || null : null;
  const notes = (String(formData.get("notes") ?? "").trim() || null) as string | null;

  await db.$transaction(async (tx) => {
    const updated = await tx.suggestion.update({
      where: { id },
      data: { status, outcome, notes },
    });
    const changes = computeChanges(
      { status: existing.status, outcome: existing.outcome, notes: existing.notes },
      { status: updated.status, outcome: updated.outcome, notes: updated.notes },
    );
    if (Object.keys(changes).length > 0) {
      await writeAudit(tx, {
        communityId: ctx.communityId,
        entityType: "suggestion",
        entityId: id,
        entityLabel: `${existing.candidateA.name} ↔ ${existing.candidateB.name}`,
        action: "update",
        actorId: ctx.userId,
        changes,
      });
    }
  });

  // No redirect: re-render whichever page submitted (profile or board).
  revalidatePath(`/app/candidates/${existing.candidateAId}`);
  revalidatePath(`/app/candidates/${existing.candidateBId}`);
  revalidatePath("/app/matches");
}
