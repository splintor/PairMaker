"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireMembership, type ActiveContext } from "@/lib/community";
import { can, canEditCandidate } from "@/lib/permissions";
import { ageToBirthdate } from "@/lib/candidate-display";
import { buildCandidateInput } from "@/lib/fields";
import { computeChanges } from "@/lib/audit-diff";
import { writeAudit } from "@/lib/audit";
import { setFlash } from "@/lib/flash-server";

/** Load a candidate the current user is allowed to mutate (own, or any when admin). */
async function loadOwned(ctx: ActiveContext, id: string) {
  const c = await db.candidate.findFirst({ where: { id, communityId: ctx.communityId } });
  if (!c) redirect("/app/candidates");
  if (!canEditCandidate(ctx.role, ctx.userId, c)) redirect(`/app/candidates/${id}`);
  return c;
}

/** Denormalized full name from the split first/last name columns. */
function fullName(columns: Record<string, unknown>): string {
  const first = String(columns.firstName ?? "").trim();
  const last = String(columns.lastName ?? "").trim();
  return [first, last].filter(Boolean).join(" ");
}

/** Convert the form's age input to a birthdate. Returns "invalid" for a malformed age. */
function birthdateFromForm(formData: FormData): Date | null | "invalid" {
  const raw = String(formData.get("age") ?? "").trim();
  if (raw === "") return null;
  const age = Number(raw);
  if (!Number.isFinite(age) || age <= 0 || age > 120) return "invalid";
  return ageToBirthdate(age);
}

export async function createCandidate(formData: FormData) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "candidate:create")) throw new Error("forbidden");

  const raw = Object.fromEntries(formData.entries());
  const { columns, details, errors } = buildCandidateInput(raw);
  if (Object.keys(errors).length > 0) {
    redirect(`/app/candidates/new?error=validation`);
  }

  const birthdate = birthdateFromForm(formData);
  if (birthdate === "invalid") redirect(`/app/candidates/new?error=validation`);

  const photoUrl = String(formData.get("photoUrl") ?? "").trim() || null;

  const created = await db.$transaction(async (tx) => {
    const c = await tx.candidate.create({
      data: {
        communityId: ctx.communityId,
        createdById: ctx.userId,
        photoUrl,
        birthdate,
        name: fullName(columns),
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
  const existing = await loadOwned(ctx, id);

  const raw = Object.fromEntries(formData.entries());
  const { columns, details, errors } = buildCandidateInput(raw);
  if (Object.keys(errors).length > 0) {
    await setFlash({ type: "error", message: "יש לתקן את השדות המסומנים" });
    redirect(`/app/candidates/${id}/edit`);
  }

  const birthdate = birthdateFromForm(formData);
  if (birthdate === "invalid") {
    await setFlash({ type: "error", message: "גיל לא תקין" });
    redirect(`/app/candidates/${id}/edit`);
  }

  const photoUrl = String(formData.get("photoUrl") ?? "").trim() || null;
  const oldPhotoUrl = existing.photoUrl;

  const beforeFlat = { ...existing, ...(existing.details as object) };
  await db.$transaction(async (tx) => {
    const updated = await tx.candidate.update({
      where: { id },
      data: {
        photoUrl,
        birthdate,
        name: fullName(columns),
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
    delete changes.name; // redundant — firstName/lastName changes are already diffed
    delete changes.details; // detail keys are already diffed individually; drop the redundant blob
    delete changes.photoUrl; // blob handle — don't print in the activity log
    delete changes.birthdate; // raw date — age is surfaced elsewhere; don't print a noisy diff
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

  if (oldPhotoUrl && oldPhotoUrl !== photoUrl) {
    const { deleteCandidatePhoto } = await import("@/lib/blob");
    await deleteCandidatePhoto(oldPhotoUrl);
  }

  revalidatePath(`/app/candidates/${id}`);
  revalidatePath("/app/candidates");
  await setFlash({ type: "success", message: "הפרטים נשמרו" });
  redirect(`/app/candidates/${id}`);
}

export async function deactivateCandidate(id: string, formData: FormData) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "candidate:deactivate")) throw new Error("forbidden");
  await loadOwned(ctx, id);

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
  await setFlash({ type: "success", message: "המועמד/ת סומן/ה כלא פעיל/ה" });
  redirect(`/app/candidates/${id}`);
}

export async function reactivateCandidate(id: string) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "candidate:deactivate")) throw new Error("forbidden");
  await loadOwned(ctx, id);

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
  await setFlash({ type: "success", message: "המועמד/ת הוחזר/ה לפעילות" });
  redirect(`/app/candidates/${id}`);
}

export async function deleteCandidate(id: string) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "candidate:delete")) throw new Error("forbidden");
  const existing = await loadOwned(ctx, id);

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

  if (existing.photoUrl) {
    const { deleteCandidatePhoto } = await import("@/lib/blob");
    await deleteCandidatePhoto(existing.photoUrl);
  }

  revalidatePath("/app/candidates");
  await setFlash({ type: "success", message: "המועמד/ת נמחק/ה" });
  redirect("/app/candidates");
}
