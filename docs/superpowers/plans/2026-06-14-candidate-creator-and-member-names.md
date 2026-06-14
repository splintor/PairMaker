# Candidate Creator Attribution + Member Names Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show which member added each candidate (list + card), and let admins set member names (required), surfaced in the top bar.

**Architecture:** A `creatorLabel` display helper feeds the list/card/profile; the candidates list query is widened to include the creator. Because sessions are JWT, `requireMembership` reads the current user's name/email from the DB (via its existing membership query) so the top bar reflects name changes. A new admin-only `setMemberName` server action plus a required name on `addMember` cover name management.

**Tech Stack:** Next.js 15 App Router, React 19, Prisma 6 + Neon, Vitest, Tailwind 3.

---

## File structure

- `src/lib/candidate-display.ts` — `creatorLabel(createdBy)` helper.
- `src/lib/community.ts` — `requireMembership` sources name/email from DB.
- `src/app/app/candidates/page.tsx` — list query includes `createdBy`.
- `src/components/CandidateCard.tsx`, `CandidateRow.tsx` — creator byline + widened prop type.
- `src/app/app/candidates/[id]/page.tsx` — use `creatorLabel`.
- `src/app/app/settings/actions.ts` — required name in `addMember`; new `setMemberName`.
- `src/app/app/settings/page.tsx` — name input on add form + per-row name editor.

---

## Task 1: `creatorLabel` display helper

**Files:**
- Modify: `src/lib/candidate-display.ts`
- Test: `src/lib/candidate-display.test.ts`

- [ ] **Step 1: Add failing test** (append to `candidate-display.test.ts`):

```ts
import { creatorLabel } from "./candidate-display";

describe("creatorLabel", () => {
  it("prefers the name", () =>
    expect(creatorLabel({ name: "שמוליק", email: "s@x.com" })).toBe("שמוליק"));
  it("falls back to email when no name", () =>
    expect(creatorLabel({ name: null, email: "s@x.com" })).toBe("s@x.com"));
  it("returns — when neither and when null", () => {
    expect(creatorLabel({ name: null, email: null })).toBe("—");
    expect(creatorLabel(null)).toBe("—");
  });
});
```

- [ ] **Step 2: Run** `npm test -- candidate-display` → expect FAIL.

- [ ] **Step 3: Implement** (append to `src/lib/candidate-display.ts`):

```ts
/** Display label for a candidate's creator: name, else email, else em-dash. */
export function creatorLabel(
  createdBy: { name: string | null; email: string | null } | null | undefined,
): string {
  return createdBy?.name ?? createdBy?.email ?? "—";
}
```

- [ ] **Step 4: Run** `npm test -- candidate-display` → expect PASS.

- [ ] **Step 5: Commit** `git add src/lib/candidate-display.ts src/lib/candidate-display.test.ts && git commit -m "feat(display): creatorLabel helper"`

---

## Task 2: List query includes the creator

**Files:**
- Modify: `src/app/app/candidates/page.tsx`

- [ ] **Step 1:** Change the candidates `findMany` to include the creator's name/email:

```tsx
const candidates = await db.candidate.findMany({
  where,
  orderBy: { updatedAt: "desc" },
  include: { createdBy: { select: { name: true, email: true } } },
});
```

- [ ] **Step 2: Run** `npx tsc --noEmit`. Expected: errors in `CandidateCard`/`CandidateRow` usage will appear here or in Task 3 — proceed to Task 3 which widens those prop types.

- [ ] **Step 3: Commit** (after Task 3 typechecks) — see Task 3 Step 4.

---

## Task 3: Creator byline on card + row

**Files:**
- Modify: `src/components/CandidateCard.tsx`, `src/components/CandidateRow.tsx`

- [ ] **Step 1:** In `CandidateCard.tsx`, import the helper, widen the prop type, and render the byline:

```tsx
import { displayAge, ageLabel, smokingLabel, creatorLabel } from "@/lib/candidate-display";

type CardCandidate = Candidate & {
  createdBy: { name: string | null; email: string | null } | null;
};

export function CandidateCard({ c }: { c: CardCandidate }) {
```
  Then, after the existing `<div className="mt-3 flex flex-wrap gap-2">…StatusPill…</div>` block, add:

```tsx
      <div className="mt-2 text-xs text-slate-400">נוסף ע״י {creatorLabel(c.createdBy)}</div>
```

- [ ] **Step 2:** In `CandidateRow.tsx`, import the helper, widen the prop type, and add a muted label before the `StatusPill`:

```tsx
import { displayAge, ageLabel, smokingLabel, creatorLabel } from "@/lib/candidate-display";

type RowCandidate = Candidate & {
  createdBy: { name: string | null; email: string | null } | null;
};

export function CandidateRow({ c }: { c: RowCandidate }) {
```
  Replace the trailing `<StatusPill … />` with:

```tsx
      <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">
        נוסף ע״י {creatorLabel(c.createdBy)}
      </span>
      <StatusPill active={c.status === "active"} gender={c.gender} />
```

- [ ] **Step 3: Run** `npx tsc --noEmit` → no errors.

- [ ] **Step 4: Commit** `git add src/app/app/candidates/page.tsx src/components/CandidateCard.tsx src/components/CandidateRow.tsx && git commit -m "feat(candidates): show who added each candidate in list and card"`

---

## Task 4: Profile uses `creatorLabel`

**Files:**
- Modify: `src/app/app/candidates/[id]/page.tsx`

- [ ] **Step 1:** Add `creatorLabel` to the existing `candidate-display` import.

- [ ] **Step 2:** Replace the inline creator expression. Find:

```tsx
          <span>נוסף ע״י {c.createdBy?.name ?? c.createdBy?.email ?? "—"}</span>
```
  Replace with:

```tsx
          <span>נוסף ע״י {creatorLabel(c.createdBy)}</span>
```

- [ ] **Step 3: Run** `npx tsc --noEmit` → no errors.

- [ ] **Step 4: Commit** `git add "src/app/app/candidates/[id]/page.tsx" && git commit -m "refactor(candidates): profile uses creatorLabel helper"`

---

## Task 5: Top bar name from DB (JWT freshness)

**Files:**
- Modify: `src/lib/community.ts`

- [ ] **Step 1:** Widen the membership query include to load the user's name/email:

```ts
const rows = await db.membership.findMany({
  where: { userId: session.user.id },
  include: { community: true, user: { select: { name: true, email: true } } },
  orderBy: { createdAt: "asc" },
});
```

- [ ] **Step 2:** Source `userName`/`userEmail` from the DB user (after the `rows.length === 0` redirect). In the returned object replace:

```ts
    userName: session.user.name ?? null,
    userEmail: session.user.email ?? null,
```
  with:

```ts
    userName: rows[0].user.name ?? null,
    userEmail: rows[0].user.email ?? null,
```

- [ ] **Step 3: Run** `npx tsc --noEmit` → no errors.

- [ ] **Step 4: Commit** `git add src/lib/community.ts && git commit -m "fix(auth): source top-bar name/email from DB so name changes show with JWT sessions"`

---

## Task 6: `setMemberName` action + required name on `addMember`

**Files:**
- Modify: `src/app/app/settings/actions.ts`

- [ ] **Step 1:** In `addMember`, require a non-empty name and persist it. After the `const role = …` line, add the name read and validation:

```ts
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    await setFlash({ type: "error", message: "יש להזין שם" });
    redirect("/app/settings");
  }
```
  Change the upsert to set the name on create and update:

```ts
    const user = await tx.user.upsert({ where: { email }, update: { name }, create: { email, name } });
```

- [ ] **Step 2:** Add a new `setMemberName` action at the end of the file:

```ts
export async function setMemberName(membershipId: string, formData: FormData) {
  const ctx = await requireMembership();
  if (!can(ctx.role, "member:manage")) throw new Error("forbidden");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    await setFlash({ type: "error", message: "יש להזין שם" });
    redirect("/app/settings");
  }

  const m = await db.membership.findFirst({
    where: { id: membershipId, communityId: ctx.communityId },
    include: { user: true },
  });
  if (!m) redirect("/app/settings");
  if (m.user.name === name) redirect("/app/settings");

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
  await setFlash({ type: "success", message: "השם עודכן" });
  redirect("/app/settings");
}
```

- [ ] **Step 3: Run** `npx tsc --noEmit` → no errors.

- [ ] **Step 4: Commit** `git add src/app/app/settings/actions.ts && git commit -m "feat(settings): setMemberName action; require name when adding a member"`

---

## Task 7: Settings UI — name input on add form + per-row editor

**Files:**
- Modify: `src/app/app/settings/page.tsx`

- [ ] **Step 1:** Import the new action — change the import line to:

```tsx
import { addMember, changeMemberRole, removeMember, renameCommunity, setMemberName } from "./actions";
```

- [ ] **Step 2:** Add a required name field to the add-member form, before the email label:

```tsx
        <label className="flex-1">
          <span className="mb-1 block text-sm text-slate-600">שם</span>
          <input name="name" type="text" dir="rtl" required placeholder="שם מלא" className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-start" />
        </label>
```

- [ ] **Step 3:** Replace the member-name display block with an inline editor. Find:

```tsx
            <div>
              <div className="font-medium text-slate-800">{m.user.name ?? m.user.email}</div>
              <div className="text-xs text-slate-400">{m.user.email}</div>
            </div>
```
  Replace with:

```tsx
            <div className="flex flex-col gap-1">
              <form action={setMemberName.bind(null, m.id)} className="flex items-end gap-2">
                <input
                  name="name"
                  type="text"
                  dir="rtl"
                  required
                  defaultValue={m.user.name ?? ""}
                  placeholder="שם מלא"
                  className="w-44 rounded-lg border border-brand-200 px-3 py-1.5 text-start text-sm"
                />
                <PendingButton className="text-xs text-brand-600 hover:underline disabled:opacity-60">שמירת שם</PendingButton>
              </form>
              <div className="text-xs text-slate-400">{m.user.email}</div>
            </div>
```

- [ ] **Step 4: Run** `npx tsc --noEmit` and `npm run build` → succeed.

- [ ] **Step 5: Commit** `git add src/app/app/settings/page.tsx && git commit -m "feat(settings): required name on add + inline per-member name editor"`

---

## Task 8: Final verification

- [ ] **Step 1:** `npm test` → all pass.
- [ ] **Step 2:** `npx tsc --noEmit` → no errors.
- [ ] **Step 3:** `npm run build` → succeeds.
- [ ] **Step 4:** Update `CLAUDE.md`: list/card now show creator; `requireMembership` reads name/email
  from DB; Settings supports per-member names (required).
- [ ] **Step 5:** Manual smoke (`npm run dev`): list + card show "נוסף ע״י …"; admin sets a member's
  name and their own name in Settings; the top bar reflects the admin's new name after navigating;
  adding a member without a name is rejected.

---

## Self-review notes

- **Spec coverage:** §1 attribution → Tasks 1–4; §2 top-bar JWT freshness → Task 5; §3 member names
  (required add + setMemberName + UI) → Tasks 6–7; §4 testing → Task 1 (`creatorLabel`). All covered.
- **Type consistency:** `creatorLabel({ name, email } | null)` defined in Task 1, consumed identically
  in Tasks 3–4; `createdBy: { name, email } | null` include (Task 2) matches the widened card/row prop
  types (Task 3); `setMemberName(membershipId, formData)` defined in Task 6 and bound the same way in
  Task 7.
- **Placeholders:** none — every code step shows concrete code.
