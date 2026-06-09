# M2 — Candidates & Audit Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app genuinely useful: a code-driven **field registry** that powers candidate forms/cards, full **candidate CRUD** (add / edit / deactivate / reactivate / delete) scoped to the active community and permission-checked, with every mutation written to a community-wide **audit log** (including a full snapshot on delete) and each candidate recording who created it.

**Architecture:** Builds directly on M1. A single `src/lib/fields.ts` registry is the source of truth for which candidate fields exist, their Hebrew labels, types, and whether each is a real Postgres column or lives in the `Candidate.details` JSONB. Pure helpers (`buildCandidateInput`, `computeChanges`) are TDD-tested in isolation; server actions wrap them with `requireMembership()` + `can()` + a Prisma transaction that writes the row and an `AuditLog` entry together. UI pages render forms and cards by iterating the registry, so adding a field later needs no UI changes.

**Tech Stack:** (unchanged from M1) Next.js 15 App Router, React 19, Prisma 6 + Neon, Auth.js v5, Tailwind 3, Vitest. New: Next.js Server Actions + `revalidatePath`.

Reference spec: `docs/superpowers/specs/2026-06-08-shidduch-matchmaker-design.md`
Prereq: M1 complete (tag `m1-foundation`). Start from a new branch `feat/m2-candidates`.

**Out of scope (later milestones):** search & filtering (M3), match tracking (M4), member management + activity-log UI (M5), photo upload to Vercel Blob (deferred — `photoUrl` stays an optional text field for now; the avatar shows initials), WhatsApp ingestion (Phase 2). The audit log is *written* in M2 but *viewed* in M5.

---

## File Structure (created/modified in this milestone)

```
src/lib/fields.ts                          # field registry + types + pure helpers
src/lib/fields.test.ts                     # Vitest: buildCandidateInput
src/lib/audit-diff.ts                      # pure computeChanges(before, after)
src/lib/audit-diff.test.ts                 # Vitest
src/lib/audit.ts                           # writeAudit(tx, {...}) persistence helper
src/lib/candidate-display.ts               # pure: derive display fields (age, card fields) from a candidate
src/lib/candidate-display.test.ts          # Vitest
src/app/app/candidates/actions.ts          # server actions: create/update/deactivate/reactivate/delete
src/app/app/candidates/page.tsx            # candidate list (active by default)
src/app/app/candidates/new/page.tsx        # add candidate
src/app/app/candidates/[id]/page.tsx       # candidate profile
src/app/app/candidates/[id]/edit/page.tsx  # edit candidate
src/components/CandidateForm.tsx            # registry-driven add/edit form (client)
src/components/CandidateCard.tsx            # candidate card (server component)
src/components/DeactivateDialog.tsx         # deactivate-with-reason (client)
src/components/DeleteCandidateButton.tsx    # delete-with-confirm (client)
src/components/ui.tsx                        # tiny shared UI atoms (Button, Field label) — keep DRY
src/app/app/page.tsx                        # MODIFY: dashboard links to candidates
src/lib/constants.ts                        # deactivation reasons, match outcomes (he labels)
```

---

## Task 1: Field registry + types

**Files:**
- Create: `src/lib/fields.ts`

> The registry is the single source of truth. `storage: "column"` fields map to real `Candidate` columns; `storage: "details"` fields live in the `details` JSONB. Core fields included now; add an entry here later to add a field — no migration.

- [ ] **Step 1: Write the registry**

Create `src/lib/fields.ts`:
```ts
export type FieldType =
  | "text"
  | "longtext"
  | "number"
  | "select"
  | "multiselect"
  | "boolean";

export type FieldOption = { value: string; label: string };

export type FieldDef = {
  key: string;
  label: string; // Hebrew
  type: FieldType;
  storage: "column" | "details";
  options?: FieldOption[]; // for select / multiselect
  required?: boolean;
  searchable?: boolean; // surfaced as a search filter in M3
  showInCard?: boolean; // shown on the candidate card
  group?: string; // form section
};

export const GENDER_OPTIONS: FieldOption[] = [
  { value: "male", label: "גבר" },
  { value: "female", label: "אישה" },
];

export const FIELDS: FieldDef[] = [
  { key: "name", label: "שם", type: "text", storage: "column", required: true, searchable: true, showInCard: true, group: "כללי" },
  { key: "gender", label: "מגדר", type: "select", storage: "column", required: true, options: GENDER_OPTIONS, searchable: true, showInCard: true, group: "כללי" },
  { key: "ageManual", label: "גיל", type: "number", storage: "column", searchable: true, showInCard: true, group: "כללי" },
  { key: "occupation", label: "עיסוק", type: "text", storage: "column", searchable: true, showInCard: true, group: "כללי" },
  { key: "heightCm", label: "גובה (ס\"מ)", type: "number", storage: "column", searchable: true, showInCard: true, group: "כללי" },
  { key: "city", label: "עיר", type: "text", storage: "column", searchable: true, showInCard: true, group: "כללי" },
  // extended fields live in `details` JSONB — demonstrates the no-migration path:
  {
    key: "sector",
    label: "מגזר / זרם",
    type: "select",
    storage: "details",
    options: [
      { value: "dati_leumi", label: "דתי-לאומי" },
      { value: "haredi", label: "חרדי" },
      { value: "masorti", label: "מסורתי" },
      { value: "other", label: "אחר" },
    ],
    searchable: true,
    showInCard: false,
    group: "רקע",
  },
  {
    key: "education",
    label: "השכלה",
    type: "select",
    storage: "details",
    options: [
      { value: "highschool", label: "תיכונית" },
      { value: "yeshiva", label: "ישיבה / מדרשה" },
      { value: "bachelor", label: "תואר ראשון" },
      { value: "graduate", label: "תואר מתקדם" },
    ],
    searchable: true,
    showInCard: false,
    group: "רקע",
  },
  { key: "requirements", label: "דרישות לבן/בת הזוג", type: "longtext", storage: "column", searchable: false, showInCard: false, group: "דרישות" },
];

export function getField(key: string): FieldDef | undefined {
  return FIELDS.find((f) => f.key === key);
}

export const COLUMN_FIELDS = FIELDS.filter((f) => f.storage === "column");
export const DETAIL_FIELDS = FIELDS.filter((f) => f.storage === "details");
export const SEARCHABLE_FIELDS = FIELDS.filter((f) => f.searchable);
export const CARD_FIELDS = FIELDS.filter((f) => f.showInCard);

export function optionLabel(field: FieldDef, value: string): string {
  return field.options?.find((o) => o.value === value)?.label ?? value;
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat(m2): candidate field registry"
```

---

## Task 2: Pure input builder (TDD)

**Files:**
- Create: `src/lib/fields.test.ts`
- Modify: `src/lib/fields.ts` (add `buildCandidateInput`)

> `buildCandidateInput` turns raw form values into `{ columns, details, errors }`, coercing numbers, validating required fields, and routing each value to a column or to `details`. Pure → TDD.

- [ ] **Step 1: Write the failing test**

Create `src/lib/fields.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildCandidateInput } from "./fields";

describe("buildCandidateInput", () => {
  it("routes column vs details and coerces numbers", () => {
    const r = buildCandidateInput({
      name: "דנה לוי",
      gender: "female",
      ageManual: "27",
      occupation: "מורה",
      heightCm: "165",
      city: "ירושלים",
      sector: "dati_leumi",
      education: "bachelor",
      requirements: "רציני ובעל מקצוע",
    });
    expect(r.errors).toEqual({});
    expect(r.columns.name).toBe("דנה לוי");
    expect(r.columns.gender).toBe("female");
    expect(r.columns.ageManual).toBe(27);
    expect(r.columns.heightCm).toBe(165);
    expect(r.details).toEqual({ sector: "dati_leumi", education: "bachelor" });
  });

  it("flags missing required fields", () => {
    const r = buildCandidateInput({ name: "", gender: "male" });
    expect(r.errors.name).toBeDefined();
  });

  it("rejects a non-numeric number field", () => {
    const r = buildCandidateInput({ name: "א", gender: "male", ageManual: "abc" });
    expect(r.errors.ageManual).toBeDefined();
  });

  it("omits empty optional fields (no null columns, no empty details keys)", () => {
    const r = buildCandidateInput({ name: "א", gender: "male", ageManual: "", sector: "" });
    expect(r.columns.ageManual).toBeUndefined();
    expect("sector" in r.details).toBe(false);
  });

  it("rejects an out-of-list select value", () => {
    const r = buildCandidateInput({ name: "א", gender: "female", sector: "not_a_real_option" });
    expect(r.errors.sector).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/fields.test.ts`
Expected: FAIL — `buildCandidateInput` is not exported.

- [ ] **Step 3: Implement `buildCandidateInput`**

Append to `src/lib/fields.ts`:
```ts
export type BuiltInput = {
  columns: Record<string, string | number>;
  details: Record<string, string | string[]>;
  errors: Record<string, string>;
};

export function buildCandidateInput(raw: Record<string, unknown>): BuiltInput {
  const columns: Record<string, string | number> = {};
  const details: Record<string, string | string[]> = {};
  const errors: Record<string, string> = {};

  for (const field of FIELDS) {
    const rawValue = raw[field.key];
    const str = rawValue == null ? "" : String(rawValue).trim();

    if (str === "") {
      if (field.required) errors[field.key] = "שדה חובה";
      continue;
    }

    let value: string | number = str;
    if (field.type === "number") {
      const n = Number(str);
      if (!Number.isFinite(n)) {
        errors[field.key] = "יש להזין מספר";
        continue;
      }
      value = n;
    }
    if ((field.type === "select" || field.type === "multiselect") && field.options) {
      const ok = field.options.some((o) => o.value === str);
      if (!ok) {
        errors[field.key] = "ערך לא חוקי";
        continue;
      }
    }

    if (field.storage === "column") columns[field.key] = value;
    else details[field.key] = value;
  }

  return { columns, details, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/fields.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(m2): buildCandidateInput with validation (TDD)"
```

---

## Task 3: Audit diff (TDD) + write helper

**Files:**
- Create: `src/lib/audit-diff.ts`
- Create: `src/lib/audit-diff.test.ts`
- Create: `src/lib/audit.ts`

- [ ] **Step 1: Write the failing test for the diff**

Create `src/lib/audit-diff.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { computeChanges } from "./audit-diff";

describe("computeChanges", () => {
  it("returns only changed keys with from/to", () => {
    const before = { name: "דנה", ageManual: 27, city: "ירושלים" };
    const after = { name: "דנה", ageManual: 28, city: "תל אביב" };
    expect(computeChanges(before, after)).toEqual({
      ageManual: { from: 27, to: 28 },
      city: { from: "ירושלים", to: "תל אביב" },
    });
  });

  it("captures added and removed keys", () => {
    expect(computeChanges({ a: 1 }, { b: 2 })).toEqual({
      a: { from: 1, to: undefined },
      b: { from: undefined, to: 2 },
    });
  });

  it("returns empty object when nothing changed", () => {
    expect(computeChanges({ a: 1 }, { a: 1 })).toEqual({});
  });

  it("treats nested detail objects by deep equality", () => {
    const before = { details: { sector: "haredi" } };
    const after = { details: { sector: "haredi" } };
    expect(computeChanges(before, after)).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/audit-diff.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the diff**

Create `src/lib/audit-diff.ts`:
```ts
export type Change = { from: unknown; to: unknown };
export type Changes = Record<string, Change>;

function eq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Shallow per-key diff; values compared by deep (JSON) equality. */
export function computeChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Changes {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: Changes = {};
  for (const k of keys) {
    if (!eq(before[k], after[k])) {
      changes[k] = { from: before[k], to: after[k] };
    }
  }
  return changes;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/audit-diff.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the audit persistence helper**

Create `src/lib/audit.ts`:
```ts
import type { Prisma, PrismaClient } from "@prisma/client";
import type { Changes } from "@/lib/audit-diff";

type Db = PrismaClient | Prisma.TransactionClient;

export type AuditAction =
  | "create"
  | "update"
  | "deactivate"
  | "reactivate"
  | "delete";

export type AuditInput = {
  communityId: string;
  entityType: "candidate" | "suggestion" | "membership" | "community";
  entityId: string;
  entityLabel: string;
  action: AuditAction;
  actorId?: string | null;
  changes?: Changes;
  snapshot?: unknown;
  note?: string;
};

/** Write a single audit-log entry. Call inside the same transaction as the mutation. */
export async function writeAudit(db: Db, input: AuditInput): Promise<void> {
  await db.auditLog.create({
    data: {
      communityId: input.communityId,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      action: input.action,
      source: "user",
      actorId: input.actorId ?? null,
      changes: (input.changes ?? undefined) as Prisma.InputJsonValue | undefined,
      snapshot: (input.snapshot ?? undefined) as Prisma.InputJsonValue | undefined,
      note: input.note,
    },
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(m2): audit diff (TDD) + writeAudit helper"
```

---

## Task 4: Constants + candidate display helper (TDD)

**Files:**
- Create: `src/lib/constants.ts`
- Create: `src/lib/candidate-display.ts`
- Create: `src/lib/candidate-display.test.ts`

- [ ] **Step 1: Constants (deactivation reasons, outcomes)**

Create `src/lib/constants.ts`:
```ts
export const DEACTIVATION_REASONS: { value: string; label: string }[] = [
  { value: "found_match", label: "מצא/ה זיווג" },
  { value: "on_break", label: "בהפסקה" },
  { value: "left", label: "עזב/ה את הקהילה" },
  { value: "other", label: "אחר" },
];

export function deactivationReasonLabel(value: string | null | undefined): string {
  if (!value) return "";
  return DEACTIVATION_REASONS.find((r) => r.value === value)?.label ?? value;
}
```

- [ ] **Step 2: Write the failing test for display age**

Create `src/lib/candidate-display.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { displayAge } from "./candidate-display";

describe("displayAge", () => {
  const now = new Date("2026-06-09T00:00:00Z");

  it("derives age from birthdate when present", () => {
    expect(displayAge({ birthdate: new Date("1996-06-09T00:00:00Z"), ageManual: null }, now)).toBe(30);
  });

  it("uses ageManual when no birthdate", () => {
    expect(displayAge({ birthdate: null, ageManual: 27 }, now)).toBe(27);
  });

  it("returns null when neither is set", () => {
    expect(displayAge({ birthdate: null, ageManual: null }, now)).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/lib/candidate-display.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

Create `src/lib/candidate-display.ts`:
```ts
export function displayAge(
  c: { birthdate: Date | null; ageManual: number | null },
  now: Date = new Date(),
): number | null {
  if (c.birthdate) {
    let age = now.getUTCFullYear() - c.birthdate.getUTCFullYear();
    const m = now.getUTCMonth() - c.birthdate.getUTCMonth();
    if (m < 0 || (m === 0 && now.getUTCDate() < c.birthdate.getUTCDate())) age--;
    return age;
  }
  if (typeof c.ageManual === "number") return c.ageManual;
  return null;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/lib/candidate-display.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(m2): constants + displayAge helper (TDD)"
```

---

## Task 5: Shared UI atoms

**Files:**
- Create: `src/components/ui.tsx`

- [ ] **Step 1: Create small reusable atoms (keep pages DRY)**

Create `src/components/ui.tsx`:
```tsx
import Link from "next/link";

export function PrimaryButton({
  children,
  type = "submit",
}: {
  children: React.ReactNode;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      className="rounded-lg bg-brand-500 px-4 py-2.5 font-medium text-white hover:bg-brand-600"
    >
      {children}
    </button>
  );
}

export function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-brand-200 bg-white px-4 py-2.5 font-medium text-brand-700 hover:bg-brand-50"
    >
      {children}
    </Link>
  );
}

export function StatusPill({ active }: { active: boolean }) {
  return active ? (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      פעיל/ה
    </span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
      לא פעיל/ה
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl2 border border-brand-200 bg-white p-5 ${className}`}>{children}</div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat(m2): shared UI atoms"
```

---

## Task 6: Candidate server actions

**Files:**
- Create: `src/app/app/candidates/actions.ts`

> Every action: `requireMembership()` → `can(role, ...)` → Prisma `$transaction` that mutates the candidate AND writes the audit entry → `revalidatePath`. Reads are scoped to `communityId`; an id that isn't in the active community is treated as not found.

- [ ] **Step 1: Write the actions**

Create `src/app/app/candidates/actions.ts`:
```ts
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
    const qs = new URLSearchParams({ error: "validation" }).toString();
    redirect(`/app/candidates/new?${qs}`);
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
      snapshot: existing,
    });
    await tx.candidate.delete({ where: { id } });
  });

  revalidatePath("/app/candidates");
  redirect("/app/candidates");
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0. (If Prisma's `InputJsonValue` typing complains about `snapshot: existing`, cast with `existing as unknown as Prisma.InputJsonValue` in the `writeAudit` call site — the snapshot is a plain record.)

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m2): candidate CRUD server actions with audit + permission checks"
```

---

## Task 7: Registry-driven candidate form

**Files:**
- Create: `src/components/CandidateForm.tsx`

- [ ] **Step 1: Build the form (renders inputs from the registry)**

Create `src/components/CandidateForm.tsx`:
```tsx
import { FIELDS, type FieldDef } from "@/lib/fields";
import { PrimaryButton, LinkButton } from "@/components/ui";

type Values = Record<string, string | number | null | undefined>;

function Input({ field, value }: { field: FieldDef; value: string }) {
  const base = "w-full rounded-lg border border-brand-200 px-3 py-2.5 text-right";
  if (field.type === "longtext") {
    return <textarea name={field.key} defaultValue={value} rows={3} className={base} />;
  }
  if (field.type === "select") {
    return (
      <select name={field.key} defaultValue={value} className={base}>
        <option value="">—</option>
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      name={field.key}
      type={field.type === "number" ? "number" : "text"}
      defaultValue={value}
      required={field.required}
      className={base}
    />
  );
}

export function CandidateForm({
  action,
  values = {},
  submitLabel,
  cancelHref,
  hasError = false,
}: {
  action: (formData: FormData) => void;
  values?: Values;
  submitLabel: string;
  cancelHref: string;
  hasError?: boolean;
}) {
  const groups = [...new Set(FIELDS.map((f) => f.group ?? "כללי"))];
  return (
    <form action={action} className="space-y-6">
      {hasError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          נא לתקן את השדות המסומנים (שדות חובה / ערכים לא תקינים).
        </p>
      )}
      {groups.map((group) => (
        <fieldset key={group} className="rounded-xl2 border border-brand-200 bg-white p-5">
          <legend className="px-2 text-sm font-bold text-brand-700">{group}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.filter((f) => (f.group ?? "כללי") === group).map((field) => (
              <label key={field.key} className={field.type === "longtext" ? "sm:col-span-2" : ""}>
                <span className="mb-1 block text-sm text-slate-600">
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </span>
                <Input field={field} value={values[field.key] == null ? "" : String(values[field.key])} />
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex gap-3">
        <PrimaryButton>{submitLabel}</PrimaryButton>
        <LinkButton href={cancelHref}>ביטול</LinkButton>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat(m2): registry-driven candidate form"
```

---

## Task 8: Candidate card + list page

**Files:**
- Create: `src/components/CandidateCard.tsx`
- Create: `src/app/app/candidates/page.tsx`

- [ ] **Step 1: Candidate card**

Create `src/components/CandidateCard.tsx`:
```tsx
import Link from "next/link";
import type { Candidate } from "@prisma/client";
import { CARD_FIELDS, optionLabel } from "@/lib/fields";
import { displayAge } from "@/lib/candidate-display";
import { StatusPill } from "@/components/ui";

export function CandidateCard({ c }: { c: Candidate }) {
  const age = displayAge(c);
  const subtitleParts = [
    age != null ? `בן/בת ${age}` : null,
    c.occupation,
    c.heightCm ? `${c.heightCm} ס"מ` : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/app/candidates/${c.id}`}
      className="block rounded-xl2 border border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100 p-4 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-lg font-bold text-white">
          {c.name.charAt(0)}
        </div>
        <div>
          <div className="font-bold text-brand-700">{c.name}</div>
          <div className="text-xs text-brand-600">{subtitleParts.join(" · ")}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusPill active={c.status === "active"} />
      </div>
    </Link>
  );
}
```

> Note: `CARD_FIELDS`/`optionLabel` are imported for future card detail rendering; the subtitle uses the most common columns directly for a clean first version.

- [ ] **Step 2: Candidate list page**

Create `src/app/app/candidates/page.tsx`:
```tsx
import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { CandidateCard } from "@/components/CandidateCard";
import { LinkButton } from "@/components/ui";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ inactive?: string }>;
}) {
  const ctx = await requireMembership();
  const { inactive } = await searchParams;
  const showInactive = inactive === "1";

  const candidates = await db.candidate.findMany({
    where: {
      communityId: ctx.communityId,
      ...(showInactive ? {} : { status: "active" }),
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-700">מועמדים ({candidates.length})</h1>
        <LinkButton href="/app/candidates/new">+ מועמד חדש</LinkButton>
      </div>
      {candidates.length === 0 ? (
        <p className="rounded-xl2 border border-dashed border-brand-200 bg-white p-8 text-center text-slate-400">
          אין מועמדים עדיין. הוסיפו מועמד ראשון.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((c) => (
            <CandidateCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: success; `/app/candidates` listed.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(m2): candidate card + list page"
```

---

## Task 9: New + Edit pages

**Files:**
- Create: `src/app/app/candidates/new/page.tsx`
- Create: `src/app/app/candidates/[id]/edit/page.tsx`

- [ ] **Step 1: New candidate page**

Create `src/app/app/candidates/new/page.tsx`:
```tsx
import { requireMembership } from "@/lib/community";
import { CandidateForm } from "@/components/CandidateForm";
import { createCandidate } from "@/app/app/candidates/actions";

export default async function NewCandidatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireMembership();
  const { error } = await searchParams;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-700">מועמד חדש</h1>
      <CandidateForm
        action={createCandidate}
        submitLabel="הוספה"
        cancelHref="/app/candidates"
        hasError={error === "validation"}
      />
    </div>
  );
}
```

- [ ] **Step 2: Edit candidate page**

Create `src/app/app/candidates/[id]/edit/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { CandidateForm } from "@/components/CandidateForm";
import { updateCandidate } from "@/app/app/candidates/actions";

export default async function EditCandidatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requireMembership();
  const { id } = await params;
  const { error } = await searchParams;
  const c = await db.candidate.findFirst({ where: { id, communityId: ctx.communityId } });
  if (!c) notFound();

  const values = { ...c, ...(c.details as Record<string, unknown>) } as Record<string, unknown>;
  const action = updateCandidate.bind(null, id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-700">עריכת מועמד</h1>
      <CandidateForm
        action={action}
        values={values as Record<string, string | number | null | undefined>}
        submitLabel="שמירה"
        cancelHref={`/app/candidates/${id}`}
        hasError={error === "validation"}
      />
    </div>
  );
}
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(m2): new + edit candidate pages"
```

---

## Task 10: Deactivate + delete UI

**Files:**
- Create: `src/components/DeactivateDialog.tsx`
- Create: `src/components/DeleteCandidateButton.tsx`

- [ ] **Step 1: Deactivate dialog (client, native <dialog>)**

Create `src/components/DeactivateDialog.tsx`:
```tsx
"use client";
import { useRef } from "react";
import { DEACTIVATION_REASONS } from "@/lib/constants";

export function DeactivateDialog({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="text-sm text-amber-700 hover:underline"
      >
        ⚠️ השבתת מועמד/ת
      </button>
      <dialog ref={ref} className="rounded-xl2 p-0 backdrop:bg-black/30">
        <form action={action} className="w-80 space-y-3 p-5 text-right">
          <h2 className="font-bold text-brand-700">השבתת מועמד/ת</h2>
          <label className="block text-sm text-slate-600">
            סיבה
            <select name="reason" required className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2">
              {DEACTIVATION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-600">
            הערה (אופציונלי)
            <textarea name="note" rows={2} className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <button className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white">אישור</button>
            <button type="button" onClick={() => ref.current?.close()} className="rounded-lg border border-brand-200 px-3 py-2 text-sm">
              ביטול
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
```

- [ ] **Step 2: Delete button (client, confirm)**

Create `src/components/DeleteCandidateButton.tsx`:
```tsx
"use client";

export function DeleteCandidateButton({ action }: { action: () => void }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("למחוק את המועמד/ת לצמיתות? הפעולה תירשם ביומן השינויים.")) {
          e.preventDefault();
        }
      }}
    >
      <button className="text-sm text-red-600 hover:underline">מחיקה</button>
    </form>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m2): deactivate dialog + delete confirm components"
```

---

## Task 11: Candidate profile page (ties it together)

**Files:**
- Create: `src/app/app/candidates/[id]/page.tsx`

- [ ] **Step 1: Profile page**

Create `src/app/app/candidates/[id]/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { FIELDS, optionLabel, getField } from "@/lib/fields";
import { displayAge } from "@/lib/candidate-display";
import { deactivationReasonLabel } from "@/lib/constants";
import { StatusPill, Card, LinkButton } from "@/components/ui";
import { DeactivateDialog } from "@/components/DeactivateDialog";
import { DeleteCandidateButton } from "@/components/DeleteCandidateButton";
import {
  deactivateCandidate,
  reactivateCandidate,
  deleteCandidate,
} from "@/app/app/candidates/actions";

export default async function CandidateProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireMembership();
  const { id } = await params;
  const c = await db.candidate.findFirst({
    where: { id, communityId: ctx.communityId },
    include: { createdBy: true },
  });
  if (!c) notFound();

  const details = (c.details as Record<string, unknown>) ?? {};
  const age = displayAge(c);
  const detailFields = FIELDS.filter(
    (f) => f.key !== "name" && f.key !== "requirements" && f.storage === "details",
  );
  const columnFields = FIELDS.filter(
    (f) => !["name", "gender", "requirements"].includes(f.key) && f.storage === "column",
  );

  const deactivateAction = deactivateCandidate.bind(null, id);
  const reactivateAction = reactivateCandidate.bind(null, id);
  const deleteAction = deleteCandidate.bind(null, id);

  function valueFor(key: string): string {
    const field = getField(key)!;
    const raw = field.storage === "column" ? (c as Record<string, unknown>)[key] : details[key];
    if (raw == null || raw === "") return "—";
    if (field.options) return optionLabel(field, String(raw));
    return String(raw);
  }

  return (
    <div className="space-y-4">
      <Link href="/app/candidates" className="text-sm text-brand-600">→ חזרה לרשימה</Link>

      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-bold text-white">
            {c.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-brand-700">{c.name}</h1>
              <StatusPill active={c.status === "active"} />
            </div>
            <div className="text-sm text-brand-600">
              {[
                optionLabel(getField("gender")!, c.gender),
                age != null ? `בן/בת ${age}` : null,
                c.occupation,
              ].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div className="flex gap-2">
            <LinkButton href={`/app/candidates/${id}/edit`}>עריכה</LinkButton>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[...columnFields, ...detailFields].map((f) => (
            <div key={f.key} className="rounded-lg bg-brand-50 p-3">
              <div className="text-xs text-slate-400">{f.label}</div>
              <div className="text-sm text-slate-700">{valueFor(f.key)}</div>
            </div>
          ))}
        </div>

        {c.requirements && (
          <div className="mt-4 rounded-lg bg-brand-50 p-3">
            <div className="text-xs text-slate-400">דרישות לבן/בת הזוג</div>
            <div className="text-sm text-slate-700">{c.requirements}</div>
          </div>
        )}

        {c.status === "inactive" && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            לא פעיל/ה · סיבה: {deactivationReasonLabel(c.deactivationReason)}
            {c.deactivationNote ? ` · ${c.deactivationNote}` : ""}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-sm text-slate-400">
          <span>נוסף ע״י {c.createdBy?.name ?? c.createdBy?.email ?? "—"}</span>
          {c.status === "active" ? (
            <DeactivateDialog action={deactivateAction} />
          ) : (
            <form action={reactivateAction}>
              <button className="text-sm text-emerald-700 hover:underline">החזרה לפעילות</button>
            </form>
          )}
          <DeleteCandidateButton action={deleteAction} />
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: success; route `/app/candidates/[id]` present.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m2): candidate profile page with deactivate/reactivate/delete + createdBy"
```

---

## Task 12: Link dashboard → candidates

**Files:**
- Modify: `src/app/app/page.tsx`

- [ ] **Step 1: Replace the placeholder line with a real entry point**

In `src/app/app/page.tsx`, replace:
```tsx
      <p className="mt-4 text-sm text-slate-400">ניהול המועמדים יתווסף ב-M2.</p>
```
with:
```tsx
      <div className="mt-4">
        <a
          href="/app/candidates"
          className="inline-block rounded-lg bg-brand-500 px-4 py-2.5 font-medium text-white hover:bg-brand-600"
        >
          לניהול המועמדים →
        </a>
      </div>
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat(m2): link dashboard to candidates"
```

---

## Task 13: Milestone verification

- [ ] **Step 1: Full unit test run**

Run: `npm test`
Expected: all pass (M1's 7 + fields 5 + audit-diff 4 + candidate-display 3 = 19).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success; routes include `/app/candidates`, `/app/candidates/new`, `/app/candidates/[id]`, `/app/candidates/[id]/edit`.

- [ ] **Step 3: Manual smoke (dev server, signed in)**

Run `npm run dev`, sign in, then:
- Go to `/app/candidates` → see the 2 seeded candidates.
- **Create**: add a candidate (fill required name + gender, pick a sector/education) → lands on its profile; appears in the list.
- **Edit**: change age + city → profile reflects it.
- **Deactivate**: use the dialog with a reason → status shows לא פעיל/ה with the reason; it disappears from the default list (reappears with `?inactive=1`).
- **Reactivate**: returns to active.
- **Delete**: confirm → removed from list.

- [ ] **Step 4: Verify audit trail was written**

Run:
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
(async () => {
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
  for (const l of logs) console.log(l.createdAt.toISOString(), l.action, l.entityType, l.entityLabel, JSON.stringify(l.changes ?? l.snapshot ? (l.action==='delete'?'[snapshot]':l.changes) : ''));
  await db.\$disconnect();
})();
"
```
Expected: entries for create / update / deactivate / reactivate / delete with the candidate's name as `entityLabel`; the delete row has a snapshot.

- [ ] **Step 5: Tag the milestone**

```bash
git tag m2-candidates
```

---

## Self-review checklist (run before handing off to execution)
- Spec coverage: full CRUD ✔, `createdBy` ✔, deactivate-with-reason ✔, delete-with-audit-snapshot ✔, field registry drives form+card+profile ✔, audit log written on every mutation ✔. (Search filters: registry marks `searchable` now; the UI lands in M3.)
- Permissions: every action calls `can(ctx.role, ...)`. (Members and admins both pass candidate actions per M1 matrix; the check is the guard for future role changes.)
- Type consistency: `buildCandidateInput` → `{columns, details, errors}` used identically in create/update; `writeAudit` signature matches all call sites; `displayAge` arg shape matches `Candidate`.

## Notes for M3 (search)
The registry's `SEARCHABLE_FIELDS` already exists; M3 builds the filter panel (all-optional filters, opposite-gender default) and a query builder over columns + `details` JSONB.
