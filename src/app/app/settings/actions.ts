"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { type Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/community";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { setFlash } from "@/lib/flash-server";

function parseRole(v: FormDataEntryValue | null): Role {
  return String(v) === "admin" ? "admin" : "member";
}

export async function renameCommunity(formData: FormData) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "member:manage")) throw new Error("forbidden");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    await setFlash({ type: "error", message: "יש להזין שם" });
    redirect("/app/settings");
  }

  const existing = await db.community.findUnique({ where: { id: ctx.communityId } });
  if (!existing || existing.name === name) redirect("/app/settings");

  await db.$transaction(async (tx) => {
    await tx.community.update({ where: { id: ctx.communityId }, data: { name } });
    await writeAudit(tx, {
      communityId: ctx.communityId,
      entityType: "community",
      entityId: ctx.communityId,
      entityLabel: name,
      action: "update",
      actorId: ctx.userId,
      changes: { name: { from: existing.name, to: name } },
    });
  });

  revalidatePath("/app/settings");
  await setFlash({ type: "success", message: "שם הקהילה עודכן" });
  redirect("/app/settings");
}

export async function addMember(formData: FormData) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "member:manage")) throw new Error("forbidden");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = parseRole(formData.get("role"));
  const name = String(formData.get("name") ?? "").trim();
  if (!email || !email.includes("@")) {
    await setFlash({ type: "error", message: "כתובת אימייל לא תקינה" });
    redirect("/app/settings");
  }
  if (!name) {
    await setFlash({ type: "error", message: "יש להזין שם" });
    redirect("/app/settings");
  }

  await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({ where: { email }, update: { name }, create: { email, name } });
    const existing = await tx.membership.findUnique({
      where: { userId_communityId: { userId: user.id, communityId: ctx.communityId } },
    });
    if (existing) return;
    await tx.membership.create({
      data: { userId: user.id, communityId: ctx.communityId, role },
    });
    await writeAudit(tx, {
      communityId: ctx.communityId,
      entityType: "membership",
      entityId: user.id,
      entityLabel: email,
      action: "create",
      actorId: ctx.userId,
      note: role,
    });
  });

  revalidatePath("/app/settings");
  await setFlash({
    type: "success",
    message: role === "admin" ? "המנהל/ת נוסף/ה" : "השדכן/ית נוסף/ה",
  });
  redirect("/app/settings");
}

export type RoleChangeResult = { ok: true } | { ok: false; error: string };

/**
 * Auto-saved from the settings client when the role dropdown changes. Takes the
 * role directly and returns a result (no redirect) so the page isn't reloaded;
 * the client reverts the dropdown and shows a toast on a failed change.
 */
export async function changeMemberRole(
  membershipId: string,
  rawRole: string,
): Promise<RoleChangeResult> {
  const ctx = await requireMembership();
  if (!can(ctx.role, "member:manage")) throw new Error("forbidden");

  const role = parseRole(rawRole);
  const m = await db.membership.findFirst({
    where: { id: membershipId, communityId: ctx.communityId },
    include: { user: true },
  });
  if (!m) return { ok: false, error: "השדכן/ית לא נמצא/ה" };
  if (m.role === role) return { ok: true };

  // Last-admin guard: don't demote the final admin.
  if (m.role === "admin" && role === "member") {
    const admins = await db.membership.count({ where: { communityId: ctx.communityId, role: "admin" } });
    if (admins <= 1) return { ok: false, error: "חייב להישאר לפחות מנהל/ת אחד/ת" };
  }

  await db.$transaction(async (tx) => {
    await tx.membership.update({ where: { id: membershipId }, data: { role } });
    await writeAudit(tx, {
      communityId: ctx.communityId,
      entityType: "membership",
      entityId: m.userId,
      entityLabel: m.user.email ?? m.user.name ?? m.userId,
      action: "update",
      actorId: ctx.userId,
      changes: { role: { from: m.role, to: role } },
    });
  });

  revalidatePath("/app/settings");
  return { ok: true };
}

/**
 * Auto-saved (debounced) from the settings client. Takes the name directly and
 * does NOT redirect — returns silently so the page isn't reloaded on each save.
 * Ignores a blank name (name is required; we keep the last value).
 */
export async function setMemberName(membershipId: string, rawName: string) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "member:manage")) throw new Error("forbidden");

  const name = rawName.trim();
  if (!name) return;

  const m = await db.membership.findFirst({
    where: { id: membershipId, communityId: ctx.communityId },
    include: { user: true },
  });
  if (!m || m.user.name === name) return;

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: m.userId }, data: { name } });
    await writeAudit(tx, {
      communityId: ctx.communityId,
      entityType: "membership",
      entityId: m.userId,
      entityLabel: m.user.email ?? name,
      action: "update",
      actorId: ctx.userId,
      changes: { name: { from: m.user.name, to: name } },
    });
  });

  revalidatePath("/app/settings");
  revalidatePath("/app", "layout"); // refresh the top bar if the admin renamed themselves
}

export async function removeMember(membershipId: string) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "member:manage")) throw new Error("forbidden");

  const m = await db.membership.findFirst({
    where: { id: membershipId, communityId: ctx.communityId },
    include: { user: true },
  });
  if (!m) redirect("/app/settings");

  if (m.role === "admin") {
    const admins = await db.membership.count({ where: { communityId: ctx.communityId, role: "admin" } });
    if (admins <= 1) {
      await setFlash({ type: "error", message: "חייב להישאר לפחות מנהל/ת אחד/ת" });
      redirect("/app/settings");
    }
  }

  await db.$transaction(async (tx) => {
    await tx.membership.delete({ where: { id: membershipId } });
    await writeAudit(tx, {
      communityId: ctx.communityId,
      entityType: "membership",
      entityId: m.userId,
      entityLabel: m.user.email ?? m.user.name ?? m.userId,
      action: "delete",
      actorId: ctx.userId,
      snapshot: { email: m.user.email, role: m.role },
    });
  });

  revalidatePath("/app/settings");
  await setFlash({ type: "success", message: "השדכן/ית הוסר/ה" });
  redirect("/app/settings");
}
