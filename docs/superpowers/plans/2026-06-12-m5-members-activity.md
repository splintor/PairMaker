# M5 — Members & Activity-Log UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give community **admins** two admin-only screens: **member management** (list members, add by email, change role, remove — with a last-admin guard, all audited) and an **activity-log viewer** that renders the community's audit trail as readable Hebrew sentences, filterable by entity type and action.

**Architecture:** Builds on M2–M4. A pure `describeAudit()` turns an audit row into a Hebrew headline — TDD-tested. Member actions (`addMember`, `changeMemberRole`, `removeMember`) wrap `requireMembership` + `can("member:manage")` + a last-admin guard + a Prisma transaction that mutates the membership and writes an `AuditLog` entry. Both pages guard on `can(role, "...")` and redirect non-admins. Actor names are resolved by fetching the community's members once and mapping `actorId → name` (no schema change — `AuditLog.actorId` stays a plain id).

**Tech Stack:** (unchanged) Next.js 15 App Router, Prisma 6 + Neon, Tailwind 3, Vitest. Reuses `Select`, `writeAudit`, `computeChanges`, `can`, field/suggestion label helpers.

Reference spec: `docs/superpowers/specs/2026-06-08-shidduch-matchmaker-design.md`
Prereq: M4 complete (tag `m4-matches`). Start from a new branch `feat/m5-members-activity`.

**Out of scope:** email *invitations* are not sent (adding a member pre-creates the user + membership; they gain access when they next sign in with that email — same mechanism as the seed); WhatsApp settings (Phase 2); editing custom field definitions (code-managed by decision).

---

## File Structure

```
src/lib/audit-format.ts                 # pure describeAudit() — Hebrew headline
src/lib/audit-format.test.ts            # Vitest
src/lib/admin.ts                         # requireAdmin() guard helper
src/app/app/settings/actions.ts          # addMember, changeMemberRole, removeMember
src/app/app/settings/page.tsx             # member management (admin)
src/app/app/activity/page.tsx             # activity-log viewer (admin)
src/components/TopNav.tsx                  # MODIFY: show הגדרות only for admins
```

---

## Task 1: `describeAudit` (TDD)

**Files:**
- Create: `src/lib/audit-format.ts`
- Test: `src/lib/audit-format.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/audit-format.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { describeAudit } from "./audit-format";

describe("describeAudit", () => {
  it("candidate actions", () => {
    expect(describeAudit({ entityType: "candidate", action: "create", entityLabel: "דנה" })).toContain("דנה");
    expect(describeAudit({ entityType: "candidate", action: "create", entityLabel: "דנה" })).toContain("נוסף");
    expect(describeAudit({ entityType: "candidate", action: "delete", entityLabel: "דנה" })).toContain("נמחק");
    expect(describeAudit({ entityType: "candidate", action: "deactivate", entityLabel: "דנה" })).toContain("הושבת");
  });
  it("suggestion actions", () => {
    expect(describeAudit({ entityType: "suggestion", action: "create", entityLabel: "א ↔ ב" })).toContain("הוצע שידוך");
  });
  it("membership actions", () => {
    expect(describeAudit({ entityType: "membership", action: "create", entityLabel: "x@y.com" })).toContain("נוסף");
    expect(describeAudit({ entityType: "membership", action: "delete", entityLabel: "x@y.com" })).toContain("הוסר");
  });
  it("falls back gracefully for unknown combos", () => {
    expect(describeAudit({ entityType: "community", action: "update", entityLabel: "X" })).toContain("X");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/audit-format.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/audit-format.ts`:
```ts
export type AuditView = { entityType: string; action: string; entityLabel: string };

export function describeAudit(e: AuditView): string {
  const L = `"${e.entityLabel}"`;
  if (e.entityType === "candidate") {
    const m: Record<string, string> = {
      create: `מועמד/ת ${L} נוסף/ה`,
      update: `מועמד/ת ${L} עודכן/ה`,
      deactivate: `מועמד/ת ${L} הושבת/ה`,
      reactivate: `מועמד/ת ${L} הוחזר/ה לפעילות`,
      delete: `מועמד/ת ${L} נמחק/ה`,
    };
    if (m[e.action]) return m[e.action];
  }
  if (e.entityType === "suggestion") {
    const m: Record<string, string> = {
      create: `הוצע שידוך: ${e.entityLabel}`,
      update: `עודכן שידוך: ${e.entityLabel}`,
      delete: `נמחק שידוך: ${e.entityLabel}`,
    };
    if (m[e.action]) return m[e.action];
  }
  if (e.entityType === "membership") {
    const m: Record<string, string> = {
      create: `חבר/ה נוסף/ה: ${e.entityLabel}`,
      update: `תפקיד עודכן: ${e.entityLabel}`,
      delete: `חבר/ה הוסר/ה: ${e.entityLabel}`,
    };
    if (m[e.action]) return m[e.action];
  }
  return `${e.entityType} · ${e.action}: ${e.entityLabel}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/audit-format.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(m5): describeAudit Hebrew formatter (TDD)"
```

---

## Task 2: Admin guard helper

**Files:**
- Create: `src/lib/admin.ts`

- [ ] **Step 1: Implement**

Create `src/lib/admin.ts`:
```ts
import { redirect } from "next/navigation";
import { requireMembership, type ActiveContext } from "@/lib/community";
import { can, type Action } from "@/lib/permissions";

/** Resolve membership and require a capability; redirect non-authorized users. */
export async function requireCapability(action: Action): Promise<ActiveContext> {
  const ctx = await requireMembership();
  if (!can(ctx.role, action)) redirect("/app/candidates");
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat(m5): requireCapability guard helper"
```

---

## Task 3: Member management actions

**Files:**
- Create: `src/app/app/settings/actions.ts`

- [ ] **Step 1: Write the actions**

Create `src/app/app/settings/actions.ts`:
```ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m5): member management actions (add/role/remove) with last-admin guard + audit"
```

---

## Task 4: Settings (members) page

**Files:**
- Create: `src/app/app/settings/page.tsx`

- [ ] **Step 1: Build the page**

Create `src/app/app/settings/page.tsx`:
```tsx
import Link from "next/link";
import { requireCapability } from "@/lib/admin";
import { db } from "@/lib/db";
import { Select } from "@/components/Select";
import { PrimaryButton } from "@/components/ui";
import { addMember, changeMemberRole, removeMember } from "./actions";

const ROLE_OPTIONS = [
  { value: "member", label: "חבר/ה" },
  { value: "admin", label: "מנהל/ת" },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requireCapability("member:manage");
  const { error } = await searchParams;

  const members = await db.membership.findMany({
    where: { communityId: ctx.communityId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-700">הגדרות · חברי הקהילה</h1>
        <Link href="/app/activity" className="text-sm text-brand-600 hover:underline">
          יומן פעילות →
        </Link>
      </div>

      {error === "lastadmin" && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          לא ניתן להסיר או לשנות את המנהל/ת האחרון/ה בקהילה.
        </p>
      )}
      {error === "email" && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">כתובת אימייל לא תקינה.</p>
      )}

      <form action={addMember} className="flex flex-wrap items-end gap-2 rounded-xl2 border border-brand-200 bg-white p-4">
        <label className="flex-1">
          <span className="mb-1 block text-sm text-slate-600">הוספת חבר/ה (אימייל)</span>
          <input name="email" type="email" dir="rtl" required placeholder="name@example.com" className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-right" />
        </label>
        <div className="w-32">
          <span className="mb-1 block text-sm text-slate-600">תפקיד</span>
          <Select name="role" options={ROLE_OPTIONS} defaultValue="member" />
        </div>
        <PrimaryButton>הוספה</PrimaryButton>
      </form>

      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl2 border border-brand-200 bg-white p-4">
            <div>
              <div className="font-medium text-slate-800">{m.user.name ?? m.user.email}</div>
              <div className="text-xs text-slate-400">{m.user.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <form action={changeMemberRole.bind(null, m.id)} className="w-32">
                <Select name="role" options={ROLE_OPTIONS} defaultValue={m.role} />
                <button className="mt-1 text-xs text-brand-600 hover:underline">עדכון תפקיד</button>
              </form>
              <form action={removeMember.bind(null, m.id)}>
                <button className="text-sm text-red-600 hover:underline">הסרה</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: success; `/app/settings` listed.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m5): settings members page (admin)"
```

---

## Task 5: Activity-log viewer

**Files:**
- Create: `src/app/app/activity/page.tsx`

- [ ] **Step 1: Build the page**

Create `src/app/app/activity/page.tsx`:
```tsx
import Link from "next/link";
import { requireCapability } from "@/lib/admin";
import { db } from "@/lib/db";
import { describeAudit } from "@/lib/audit-format";

const ENTITY_OPTIONS = [
  { value: "", label: "הכל" },
  { value: "candidate", label: "מועמדים" },
  { value: "suggestion", label: "שידוכים" },
  { value: "membership", label: "חברים" },
];
const ACTION_LABELS: Record<string, string> = {
  create: "יצירה",
  update: "עדכון",
  deactivate: "השבתה",
  reactivate: "החזרה לפעילות",
  delete: "מחיקה",
};

function fmtTime(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; action?: string }>;
}) {
  const ctx = await requireCapability("audit:view");
  const { entityType, action } = await searchParams;

  const where = {
    communityId: ctx.communityId,
    ...(entityType ? { entityType } : {}),
    ...(action ? { action } : {}),
  };
  const LIMIT = 200;
  const logs = await db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: LIMIT });

  // Resolve actor ids → names (members are few).
  const members = await db.membership.findMany({ where: { communityId: ctx.communityId }, include: { user: true } });
  const nameById = new Map(members.map((m) => [m.userId, m.user.name ?? m.user.email ?? ""]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-700">יומן פעילות</h1>
        <Link href="/app/settings" className="text-sm text-brand-600 hover:underline">← הגדרות</Link>
      </div>

      <form method="get" className="flex flex-wrap gap-3 rounded-xl2 border border-brand-200 bg-white p-3 text-sm">
        <label className="flex items-center gap-2">
          סוג:
          <select name="entityType" defaultValue={entityType ?? ""} dir="rtl" className="rounded-lg border border-brand-200 px-2 py-1.5">
            {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          פעולה:
          <select name="action" defaultValue={action ?? ""} dir="rtl" className="rounded-lg border border-brand-200 px-2 py-1.5">
            <option value="">הכל</option>
            {Object.entries(ACTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <button className="rounded-lg bg-brand-500 px-4 py-1.5 font-medium text-white hover:bg-brand-600">סינון</button>
        <Link href="/app/activity" className="self-center text-brand-600 hover:underline">ניקוי</Link>
      </form>

      {logs.length >= LIMIT && (
        <p className="text-xs text-slate-400">מוצגות {LIMIT} הרשומות האחרונות.</p>
      )}

      <ul className="space-y-2">
        {logs.map((l) => {
          const changes = (l.changes as Record<string, { from: unknown; to: unknown }> | null) ?? null;
          return (
            <li key={l.id} className="rounded-xl2 border border-brand-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-800">{describeAudit(l)}</span>
                <span className="shrink-0 text-xs text-slate-400">{fmtTime(l.createdAt)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {l.source === "bot" ? "🤖 בוט" : `ע״י ${nameById.get(l.actorId ?? "") || "—"}`}
              </div>
              {changes && Object.keys(changes).length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                  {Object.entries(changes).map(([field, ch]) => (
                    <li key={field}>
                      {field}: {String(ch.from ?? "—")} ← {String(ch.to ?? "—")}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
        {logs.length === 0 && (
          <li className="rounded-xl2 border border-dashed border-brand-200 bg-white p-8 text-center text-slate-400">
            אין רשומות התואמות את הסינון.
          </li>
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: success; `/app/activity` listed.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m5): activity-log viewer (admin, filterable, Hebrew sentences)"
```

---

## Task 6: Gate the הגדרות nav link to admins

**Files:**
- Modify: `src/components/TopNav.tsx`

- [ ] **Step 1: Only show הגדרות for admins**

In `src/components/TopNav.tsx`, find:
```tsx
        <Link href="/app/settings" className="text-slate-500">
          הגדרות
        </Link>
```
Replace with:
```tsx
        {ctx.role === "admin" && (
          <Link href="/app/settings" className="text-slate-500">
            הגדרות
          </Link>
        )}
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m5): show הגדרות nav link to admins only"
```

---

## Task 7: Milestone verification

- [ ] **Step 1: Unit tests**

Run: `npm test`
Expected: all pass (M4's 35 + 4 new = 39).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success; routes include `/app/settings` and `/app/activity`.

- [ ] **Step 3: Manual smoke (dev server, signed in as admin)**

`npm run dev`, sign in (splintor@gmail.com is admin):
- **הגדרות** appears in the nav (admins only). Open it.
- **Add member**: enter an email + role → appears in the list; signing in with that email later grants access.
- **Change role**: switch a member to מנהל/ת and back.
- **Last-admin guard**: try to remove/demote yourself as the only admin → blocked with the amber message.
- **Activity log**: open "יומן פעילות" → recent actions render as Hebrew sentences with actor + time; filter by סוג=שידוכים or פעולה=מחיקה; the membership changes you just made appear.

- [ ] **Step 4: Verify membership audit entries**

Run:
```bash
cat > ./mem-check.mts <<'EOF'
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
const logs = await db.auditLog.findMany({ where: { entityType: "membership" }, orderBy: { createdAt: "desc" }, take: 6 });
for (const l of logs) console.log(l.action, "|", l.entityLabel, "|", JSON.stringify(l.changes ?? l.snapshot ?? {}));
const admins = await db.membership.count({ where: { role: "admin" } });
console.log("admin memberships:", admins);
await db.$disconnect();
EOF
node --import tsx ./mem-check.mts 2>&1 | grep -vE "deprecated|prisma-config|^$" | tail -8
rm -f ./mem-check.mts
```
Expected: membership `create`/`update`/`delete` rows; at least 1 admin remains.

- [ ] **Step 5: Tag**

```bash
git tag m5-members-activity
```

---

## Self-review checklist
- Spec coverage: admin-only member add/edit/role/remove ✔; last-admin guard ✔; all member changes audited ✔; activity-log viewer with readable Hebrew + filters ✔; admin-only access on both screens (`requireCapability`) ✔; הגדרות nav gated to admins ✔.
- Type consistency: `requireCapability(action)` returns `ActiveContext`; `Role` from Prisma used in actions; `describeAudit` input shape matches the `AuditLog` fields selected.
- Placeholder scan: none.

## Notes for M6 (polish) & Phase 2
- M6: responsive/mobile pass (filters drawer, nav), empty states, RTL nits.
- Phase 2 (bot) writes through the same `writeAudit` with `source: "bot"`, which the activity log already renders ("🤖 בוט").
