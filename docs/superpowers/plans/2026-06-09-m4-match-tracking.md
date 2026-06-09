# M4 — Match Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let matchmakers **suggest a match** between two opposite-gender candidates and **track it through the funnel** Proposed → Accepted → Meeting → Closed (with an outcome), with notes — every change audited, shown on both candidates' profiles, and managed from a community **matches board**. Re-suggesting the same pair is prevented.

**Architecture:** Builds on M2/M3. A pure `suggestions.ts` holds the funnel/outcome constants and small pure helpers (`makePairKey`, `oppositeGender`) — TDD-tested. Server actions (`createSuggestion`, `updateSuggestion`) wrap them with `requireMembership` + `can("suggestion:manage")` + a Prisma transaction that writes the row and an `AuditLog` entry. The "suggest a match" page reuses M3's `buildCandidateWhere` + `SearchPanel`, seeded to the **opposite gender** and excluding the candidate themself and any already-suggested partner. One reusable `SuggestionItem` renders the funnel + an update form on both the profile and the matches board.

**Tech Stack:** (unchanged) Next.js 15 App Router, Prisma 6 + Neon (serverless adapter), Tailwind 3, Vitest. Reuses `Select`, `buildCandidateWhere`, `SearchPanel`, `writeAudit`, `computeChanges`, field registry.

Reference spec: `docs/superpowers/specs/2026-06-08-shidduch-matchmaker-design.md`
Prereq: M3 complete (tag `m3-search`). Start from a new branch `feat/m4-matches`.

**Out of scope:** automated match *scoring/recommendations* (matchmakers choose manually — explicit non-goal in the spec); deleting suggestions (not required; status `closed` + outcome covers "didn't work out"); the audit-log *viewer* (M5).

---

## File Structure

```
src/lib/suggestions.ts                       # constants + pure helpers (makePairKey, oppositeGender, labels)
src/lib/suggestions.test.ts                  # Vitest
src/app/app/matches/actions.ts               # createSuggestion, updateSuggestion
src/components/SuggestionItem.tsx            # funnel display + update form (reused)
src/app/app/matches/page.tsx                 # matches board grouped by status
src/app/app/candidates/[id]/suggest/page.tsx # opposite-gender suggest flow
src/app/app/candidates/[id]/page.tsx         # MODIFY: + הצעת שידוך button + suggestions section
```

---

## Task 1: Constants + pure helpers (TDD)

**Files:**
- Create: `src/lib/suggestions.ts`
- Test: `src/lib/suggestions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/suggestions.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { makePairKey, oppositeGender, statusIndex } from "./suggestions";

describe("makePairKey", () => {
  it("is order-independent", () => {
    expect(makePairKey("a", "b")).toBe(makePairKey("b", "a"));
  });
  it("joins sorted ids", () => {
    expect(makePairKey("z9", "a1")).toBe("a1:z9");
  });
});

describe("oppositeGender", () => {
  it("flips male/female", () => {
    expect(oppositeGender("male")).toBe("female");
    expect(oppositeGender("female")).toBe("male");
  });
});

describe("statusIndex", () => {
  it("orders the funnel", () => {
    expect(statusIndex("proposed")).toBe(0);
    expect(statusIndex("closed")).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/suggestions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/suggestions.ts`:
```ts
import type { SuggestionStatus } from "@prisma/client";

export function makePairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

export function oppositeGender(g: "male" | "female"): "male" | "female" {
  return g === "male" ? "female" : "male";
}

export const SUGGESTION_STATUSES: { value: SuggestionStatus; label: string }[] = [
  { value: "proposed", label: "הוצע" },
  { value: "accepted", label: "הסכימו" },
  { value: "meeting", label: "בפגישה" },
  { value: "closed", label: "נסגר" },
];

export const SUGGESTION_OUTCOMES: { value: string; label: string }[] = [
  { value: "engaged", label: "התארסו 🎉" },
  { value: "not_a_fit", label: "לא התאים" },
  { value: "on_hold", label: "בהמתנה" },
];

export function statusLabel(s: SuggestionStatus): string {
  return SUGGESTION_STATUSES.find((x) => x.value === s)?.label ?? s;
}

export function outcomeLabel(v: string | null | undefined): string {
  if (!v) return "";
  return SUGGESTION_OUTCOMES.find((x) => x.value === v)?.label ?? v;
}

export function statusIndex(s: SuggestionStatus): number {
  return SUGGESTION_STATUSES.findIndex((x) => x.value === s);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/suggestions.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(m4): suggestion constants + pure helpers (TDD)"
```

---

## Task 2: Suggestion server actions

**Files:**
- Create: `src/app/app/matches/actions.ts`

- [ ] **Step 1: Write the actions**

Create `src/app/app/matches/actions.ts`:
```ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m4): suggestion create/update server actions with audit + pair guard"
```

---

## Task 3: SuggestionItem component (funnel + update form)

**Files:**
- Create: `src/components/SuggestionItem.tsx`

> Reused on the profile and the matches board. Shows the pair, a status pill, the inline funnel (current step bold), outcome on closed, notes, and a collapsible update form (status + outcome + notes → `updateSuggestion`).

- [ ] **Step 1: Build it**

Create `src/components/SuggestionItem.tsx`:
```tsx
import Link from "next/link";
import type { Suggestion, Candidate } from "@prisma/client";
import { Select } from "@/components/Select";
import {
  SUGGESTION_STATUSES,
  SUGGESTION_OUTCOMES,
  statusLabel,
  outcomeLabel,
  statusIndex,
} from "@/lib/suggestions";
import { updateSuggestion } from "@/app/app/matches/actions";

type WithPair = Suggestion & { candidateA: Candidate; candidateB: Candidate };

export function SuggestionItem({ s }: { s: WithPair }) {
  const action = updateSuggestion.bind(null, s.id);
  const current = statusIndex(s.status);

  return (
    <div id={s.id} className="rounded-xl2 border border-brand-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="font-medium text-slate-800">
          <Link href={`/app/candidates/${s.candidateAId}`} className="text-brand-700 hover:underline">
            {s.candidateA.name}
          </Link>
          {" ↔ "}
          <Link href={`/app/candidates/${s.candidateBId}`} className="text-brand-700 hover:underline">
            {s.candidateB.name}
          </Link>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
          {statusLabel(s.status)}
          {s.status === "closed" && s.outcome ? ` · ${outcomeLabel(s.outcome)}` : ""}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1 text-xs">
        {SUGGESTION_STATUSES.map((st, i) => (
          <span key={st.value} className={i <= current ? "font-bold text-brand-700" : "text-slate-400"}>
            {st.label}
            {i < SUGGESTION_STATUSES.length - 1 ? " ▸ " : ""}
          </span>
        ))}
      </div>

      {s.notes && <p className="mt-2 text-sm text-slate-600">{s.notes}</p>}

      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-brand-600">עדכון</summary>
        <form action={action} className="mt-2 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-sm text-slate-600">
              שלב
              <div className="mt-1">
                <Select name="status" options={SUGGESTION_STATUSES} defaultValue={s.status} />
              </div>
            </label>
            <label className="block text-sm text-slate-600">
              תוצאה (בסגירה)
              <div className="mt-1">
                <Select name="outcome" options={SUGGESTION_OUTCOMES} defaultValue={s.outcome ?? ""} placeholder="—" />
              </div>
            </label>
          </div>
          <textarea
            name="notes"
            dir="rtl"
            rows={2}
            defaultValue={s.notes ?? ""}
            placeholder="הערות"
            className="w-full rounded-lg border border-brand-200 px-3 py-2 text-right"
          />
          <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            שמירה
          </button>
        </form>
      </details>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat(m4): SuggestionItem (funnel display + update form)"
```

---

## Task 4: Suggest-a-match page (opposite-gender search)

**Files:**
- Create: `src/app/app/candidates/[id]/suggest/page.tsx`

- [ ] **Step 1: Build the page**

Create `src/app/app/candidates/[id]/suggest/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { SearchPanel } from "@/components/SearchPanel";
import { buildCandidateWhere, type SearchParams } from "@/lib/candidate-search";
import { oppositeGender } from "@/lib/suggestions";
import { displayAge, ageLabel } from "@/lib/candidate-display";
import { createSuggestion } from "@/app/app/matches/actions";

export default async function SuggestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireMembership();
  const { id } = await params;
  const raw = await searchParams;

  const source = await db.candidate.findFirst({ where: { id, communityId: ctx.communityId } });
  if (!source) notFound();

  const sp: SearchParams = {};
  for (const [k, v] of Object.entries(raw)) sp[k] = Array.isArray(v) ? v[0] : v;
  // Default to the opposite gender (matchmaker may still change it).
  if (!sp.gender) sp.gender = oppositeGender(source.gender);

  // Exclude self + already-suggested partners.
  const existing = await db.suggestion.findMany({
    where: { communityId: ctx.communityId, OR: [{ candidateAId: id }, { candidateBId: id }] },
  });
  const excluded = [id, ...existing.map((s) => (s.candidateAId === id ? s.candidateBId : s.candidateAId))];

  const where = buildCandidateWhere(sp, ctx.communityId);
  (where.AND as object[]).push({ id: { notIn: excluded } });
  const matches = await db.candidate.findMany({ where, orderBy: { updatedAt: "desc" } });

  return (
    <div className="space-y-4">
      <Link href={`/app/candidates/${id}`} className="text-sm text-brand-600">→ חזרה לפרופיל</Link>
      <h1 className="text-xl font-bold text-brand-700">הצעת שידוך עבור {source.name}</h1>

      <SearchPanel params={sp} />

      <div className="text-sm text-slate-500">{matches.length} מועמדים אפשריים</div>

      {matches.length === 0 ? (
        <p className="rounded-xl2 border border-dashed border-brand-200 bg-white p-8 text-center text-slate-400">
          אין מועמדים מתאימים (אולי כולם כבר הוצעו).
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((m) => {
            const suggest = createSuggestion.bind(null, id, m.id);
            const age = displayAge(m);
            return (
              <div key={m.id} className="flex items-center justify-between rounded-xl2 border border-brand-200 bg-white p-4">
                <div>
                  <Link href={`/app/candidates/${m.id}`} className="font-bold text-brand-700 hover:underline">
                    {m.name}
                  </Link>
                  <div className="text-xs text-brand-600">
                    {[ageLabel(m.gender, age), m.occupation].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <form action={suggest}>
                  <button className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600">
                    הצע
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: success; `/app/candidates/[id]/suggest` listed.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m4): suggest-a-match page (opposite-gender search, excludes self + suggested)"
```

---

## Task 5: Profile integration (suggest button + suggestions section)

**Files:**
- Modify: `src/app/app/candidates/[id]/page.tsx`

- [ ] **Step 1: Load suggestions for the candidate**

In `src/app/app/candidates/[id]/page.tsx`, after the existing `const c = await db.candidate.findFirst(... include: { createdBy: true } )` block, add a query for this candidate's suggestions. Add this import near the top:
```tsx
import { SuggestionItem } from "@/components/SuggestionItem";
```
And after `if (!c) notFound();` add:
```tsx
  const suggestions = await db.suggestion.findMany({
    where: { communityId: ctx.communityId, OR: [{ candidateAId: id }, { candidateBId: id }] },
    include: { candidateA: true, candidateB: true },
    orderBy: { updatedAt: "desc" },
  });
```

- [ ] **Step 2: Add the "+ הצעת שידוך" button next to "עריכה"**

Find the actions block:
```tsx
          <div className="flex gap-2">
            <LinkButton href={`/app/candidates/${id}/edit`}>עריכה</LinkButton>
          </div>
```
Replace with:
```tsx
          <div className="flex gap-2">
            {c.status === "active" && (
              <LinkButton href={`/app/candidates/${id}/suggest`}>+ הצעת שידוך</LinkButton>
            )}
            <LinkButton href={`/app/candidates/${id}/edit`}>עריכה</LinkButton>
          </div>
```

- [ ] **Step 3: Render the suggestions section after the main `Card`**

Immediately before the final closing `</div>` of the returned JSX (after the `</Card>`), add:
```tsx
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-brand-700">הצעות שידוך ({suggestions.length})</h2>
        {suggestions.length === 0 ? (
          <p className="rounded-xl2 border border-dashed border-brand-200 bg-white p-6 text-center text-sm text-slate-400">
            אין הצעות עדיין.
          </p>
        ) : (
          suggestions.map((s) => <SuggestionItem key={s.id} s={s} />)
        )}
      </div>
```

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(m4): candidate profile — suggest button + suggestions section"
```

---

## Task 6: Matches board

**Files:**
- Create: `src/app/app/matches/page.tsx`

- [ ] **Step 1: Build the board (grouped by status)**

Create `src/app/app/matches/page.tsx`:
```tsx
import { requireMembership } from "@/lib/community";
import { db } from "@/lib/db";
import { SuggestionItem } from "@/components/SuggestionItem";
import { SUGGESTION_STATUSES } from "@/lib/suggestions";

export default async function MatchesPage() {
  const ctx = await requireMembership();
  const suggestions = await db.suggestion.findMany({
    where: { communityId: ctx.communityId },
    include: { candidateA: true, candidateB: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-brand-700">שידוכים ({suggestions.length})</h1>
      {suggestions.length === 0 && (
        <p className="rounded-xl2 border border-dashed border-brand-200 bg-white p-8 text-center text-slate-400">
          אין הצעות שידוך עדיין. הציעו שידוך מתוך פרופיל מועמד.
        </p>
      )}
      {SUGGESTION_STATUSES.map((st) => {
        const group = suggestions.filter((s) => s.status === st.value);
        if (group.length === 0) return null;
        return (
          <section key={st.value} className="space-y-2">
            <h2 className="text-sm font-bold text-slate-500">
              {st.label} ({group.length})
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {group.map((s) => (
                <SuggestionItem key={s.id} s={s} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: success; `/app/matches` listed (the TopNav "שידוכים" link now resolves).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m4): matches board grouped by funnel status"
```

---

## Task 7: Milestone verification

- [ ] **Step 1: Unit tests**

Run: `npm test`
Expected: all pass (M3's 31 + 5 new = 36).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success; routes include `/app/matches` and `/app/candidates/[id]/suggest`.

- [ ] **Step 3: Manual smoke (dev server, signed in)**

`npm run dev`, sign in, open a candidate (e.g. דנה לוי):
- Click **+ הצעת שידוך** → the list defaults to the **opposite gender**; the candidate themself and prior partners are excluded.
- Click **הצע** on someone → back on the profile, a suggestion appears under **הצעות שידוך** at status **הוצע**.
- Open **עדכון** → change שלב to **בפגישה**, save → the pill + funnel update; do it again to **נסגר** with תוצאה = **לא התאים**.
- Visit **שידוכים** (top nav) → the suggestion appears under its status group; the same item shows on **both** candidates' profiles.
- Re-open **+ הצעת שידוך** for the same candidate → the already-suggested partner is no longer listed.
- Try suggesting an already-suggested pair from the other side → you're redirected to the matches board (no duplicate).

- [ ] **Step 4: Verify suggestion audit entries**

Run:
```bash
cat > ./sugg-check.mts <<'EOF'
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
const logs = await db.auditLog.findMany({ where: { entityType: "suggestion" }, orderBy: { createdAt: "desc" }, take: 6 });
for (const l of logs) console.log(l.action, "|", l.entityLabel, "|", JSON.stringify(l.changes ?? {}));
const dupes = await db.suggestion.groupBy({ by: ["communityId", "pairKey"], _count: { _all: true }, having: { pairKey: { _count: { gt: 1 } } } });
console.log("duplicate pairs (should be 0):", dupes.length);
await db.$disconnect();
EOF
node --import tsx ./sugg-check.mts 2>&1 | grep -vE "deprecated|prisma-config|^$" | tail -8
rm -f ./sugg-check.mts
```
Expected: `create` and `update` rows for suggestions (with status/outcome diffs), and **duplicate pairs: 0**.

- [ ] **Step 5: Tag**

```bash
git tag m4-matches
```

---

## Self-review checklist
- Spec coverage: suggest a match ✔; opposite-gender default ✔ (seeded, changeable); funnel Proposed→Accepted→Meeting→Closed + outcome ✔; notes ✔; no duplicate pairs (pre-check + unique constraint + P2002 catch) ✔; shown on both profiles ✔; matches board ✔; every change audited ✔.
- Type consistency: `WithPair` (Suggestion + candidateA/candidateB) used by `SuggestionItem`, board, and profile queries; `updateSuggestion(id, formData)` / `createSuggestion(aId, bId)` signatures match all `.bind` call sites; `SuggestionStatus` from Prisma used consistently.
- Placeholder scan: none.

## Notes for M5 (members + activity-log UI)
The `AuditLog` now has candidate *and* suggestion entries — M5's activity-log viewer renders both as Hebrew sentences; member management adds `membership` audit entries via the same `writeAudit`.
