"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { type Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/community";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

function parseRole(v: FormDataEntryValue | null): Role {
  return String(v) === "admin" ? "admin" : "member";
}

export async function renameCommunity(formData: FormData) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "member:manage")) throw new Error("forbidden");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/app/settings?error=name");

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
  redirect("/app/settings");
}

export async function addMember(formData: FormData) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "member:manage")) throw new Error("forbidden");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = parseRole(formData.get("role"));
  if (!email || !email.includes("@")) redirect("/app/settings?error=email");

  await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({ where: { email }, update: {}, create: { email } });
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
  redirect("/app/settings");
}

export async function changeMemberRole(membershipId: string, formData: FormData) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "member:manage")) throw new Error("forbidden");

  const role = parseRole(formData.get("role"));
  const m = await db.membership.findFirst({
    where: { id: membershipId, communityId: ctx.communityId },
    include: { user: true },
  });
  if (!m) redirect("/app/settings");
  if (m.role === role) redirect("/app/settings");

  // Last-admin guard: don't demote the final admin.
  if (m.role === "admin" && role === "member") {
    const admins = await db.membership.count({ where: { communityId: ctx.communityId, role: "admin" } });
    if (admins <= 1) redirect("/app/settings?error=lastadmin");
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
  redirect("/app/settings");
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
    if (admins <= 1) redirect("/app/settings?error=lastadmin");
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
  redirect("/app/settings");
}
