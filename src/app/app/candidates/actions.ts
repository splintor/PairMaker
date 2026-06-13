"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/community";
import { can } from "@/lib/permissions";
import { buildCandidateInput } from "@/lib/fields";
import { computeChanges } from "@/lib/audit-diff";
import { writeAudit } from "@/lib/audit";
import { setFlash } from "@/lib/flash-server";

async function loadOwned(communityId: string, id: string) {
  const c = await db.candidate.findFirst({ where: { id, communityId } });
  if (!c) redirect("/app/candidates");
  return c;
}

export async function createCandidate(formData: FormData) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "candidate:create")) throw new Error("forbidden");

  const raw = Object.fromEntries(formData.entries());
  const { columns, details, errors } = buildCandidateInput(raw);
  if (Object.keys(errors).length > 0) {
    redirect(`/app/candidates/new?error=validation`);
  }

  const created = await db.$transaction(async (tx) => {
    const c = await tx.candidate.create({
      data: {
        communityId: ctx.communityId,
        createdById: ctx.userId,
        details: details as Prisma.InputJsonValue,
        ...(columns as Record<string, unknown>),
      } as Prisma.CandidateUncheckedCreateInput,
    });
    await writeAudit(tx, {
      communityId: ctx.communityId,
      entityType: "candidate",
      entityId: c.id,
      entityLabel: c.name,
      action: "create",
      actorId: ctx.userId,
    });
    return c;
  });

  revalidatePath("/app/candidates");
  await setFlash({ type: "success", message: "המועמד נוסף בהצלחה" });
  redirect(`/app/candidates/${created.id}`);
}

export async function updateCandidate(id: string, formData: FormData) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "candidate:edit")) throw new Error("forbidden");
  const existing = await loadOwned(ctx.communityId, id);

  const raw = Object.fromEntries(formData.entries());
  const { columns, details, errors } = buildCandidateInput(raw);
  if (Object.keys(errors).length > 0) {
    redirect(`/app/candidates/${id}/edit?error=validation`);
  }

  const beforeFlat = { ...existing, ...(existing.details as object) };
  await db.$transaction(async (tx) => {
    const updated = await tx.candidate.update({
      where: { id },
      data: {
        details: details as Prisma.InputJsonValue,
        ...(columns as Record<string, unknown>),
      } as Prisma.CandidateUncheckedUpdateInput,
    });
    const afterFlat = { ...updated, ...(updated.details as object) };
    const changes = computeChanges(
      beforeFlat as Record<string, unknown>,
      afterFlat as Record<string, unknown>,
    );
    delete changes.updatedAt;
    delete changes.details; // detail keys are already diffed individually; drop the redundant blob
    if (Object.keys(changes).length > 0) {
      await writeAudit(tx, {
        communityId: ctx.communityId,
        entityType: "candidate",
        entityId: id,
        entityLabel: updated.name,
        action: "update",
        actorId: ctx.userId,
        changes,
      });
    }
  });

  revalidatePath(`/app/candidates/${id}`);
  revalidatePath("/app/candidates");
  redirect(`/app/candidates/${id}`);
}

export async function deactivateCandidate(id: string, formData: FormData) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "candidate:deactivate")) throw new Error("forbidden");
  await loadOwned(ctx.communityId, id);

  const reason = String(formData.get("reason") ?? "");
  const note = String(formData.get("note") ?? "");

  await db.$transaction(async (tx) => {
    const updated = await tx.candidate.update({
      where: { id },
      data: {
        status: "inactive",
        deactivationReason: reason || null,
        deactivationNote: note || null,
        deactivatedAt: new Date(),
      },
    });
    await writeAudit(tx, {
      communityId: ctx.communityId,
      entityType: "candidate",
      entityId: id,
      entityLabel: updated.name,
      action: "deactivate",
      actorId: ctx.userId,
      note: reason,
    });
  });

  revalidatePath(`/app/candidates/${id}`);
  revalidatePath("/app/candidates");
  redirect(`/app/candidates/${id}`);
}

export async function reactivateCandidate(id: string) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "candidate:deactivate")) throw new Error("forbidden");
  await loadOwned(ctx.communityId, id);

  await db.$transaction(async (tx) => {
    const updated = await tx.candidate.update({
      where: { id },
      data: { status: "active", deactivationReason: null, deactivationNote: null, deactivatedAt: null },
    });
    await writeAudit(tx, {
      communityId: ctx.communityId,
      entityType: "candidate",
      entityId: id,
      entityLabel: updated.name,
      action: "reactivate",
      actorId: ctx.userId,
    });
  });

  revalidatePath(`/app/candidates/${id}`);
  revalidatePath("/app/candidates");
  redirect(`/app/candidates/${id}`);
}

export async function deleteCandidate(id: string) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "candidate:delete")) throw new Error("forbidden");
  const existing = await loadOwned(ctx.communityId, id);

  await db.$transaction(async (tx) => {
    await writeAudit(tx, {
      communityId: ctx.communityId,
      entityType: "candidate",
      entityId: id,
      entityLabel: existing.name,
      action: "delete",
      actorId: ctx.userId,
      snapshot: existing as unknown as Prisma.InputJsonValue,
    });
    await tx.candidate.delete({ where: { id } });
  });

  revalidatePath("/app/candidates");
  redirect("/app/candidates");
}
