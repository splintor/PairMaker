# Login Audit Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record one `login` audit-log entry per community a user belongs to on every successful sign-in, rendered and filterable in the activity viewer.

**Architecture:** A `recordLogin(user)` helper fans out one `writeAudit` row per membership; it's invoked from NextAuth v5's `events.signIn` (fire-and-forget, never blocks login). The audit type unions, the Hebrew renderer, and the activity filters gain `"auth"`/`"login"`.

**Tech Stack:** NextAuth v5 (Auth.js), Prisma/Neon, Next.js App Router, Vitest (pure-logic tests).

**Spec:** `docs/superpowers/specs/2026-06-14-login-audit-design.md`

**Conventions:** `writeAudit(db, input)` (in `src/lib/audit.ts`) writes one row and hardcodes `source: "user"`. `describeAudit` (in `src/lib/audit-format.ts`) returns `{before,label,after}` and has a fallback for unknown combos. The activity page is admin-only and filters by `entityType`/`action` query params. No schema change — `AuditLog.entityType`/`action` are free strings.

**Global verification (after every task):** `npx tsc --noEmit`, `npm test`, `npm run build` — all green.

---

## File Structure

**New**
- `src/lib/audit-login.ts` — `recordLogin(user)`: fan out one `login` audit row per community. *Single responsibility: turn a sign-in into audit rows.*

**Modified**
- `src/lib/audit.ts` — widen `AuditAction` (`+"login"`) and `AuditInput.entityType` (`+"auth"`).
- `src/lib/audit-format.ts` — render the `auth`/`login` case.
- `src/lib/audit-format.test.ts` — test the new rendering.
- `src/components/ActivityFilters.tsx` — add `auth` entity + `login` action filter options.
- `src/lib/auth.ts` — add `events.signIn` calling `recordLogin`.

---

## Task 1: Audit types + rendering + filters (TDD)

**Files:** Modify `src/lib/audit.ts`, `src/lib/audit-format.ts`, `src/lib/audit-format.test.ts`, `src/components/ActivityFilters.tsx`

- [ ] **Step 1: Write the failing test**

In `src/lib/audit-format.test.ts`, add inside the `describe("auditSentence", ...)` block (after the "community rename" test):

```ts
  it("login action", () => {
    expect(auditSentence({ entityType: "auth", action: "login", entityLabel: "יוסי" })).toContain("התחברות");
    expect(auditSentence({ entityType: "auth", action: "login", entityLabel: "יוסי" })).toContain("יוסי");
  });
```

And add to the `describe("auditHref", ...)` block:

```ts
  it("does not link auth/login events", () => {
    expect(auditHref({ entityType: "auth", entityId: "u1", action: "login" })).toBeNull();
  });
```

- [ ] **Step 2: Run the test, verify the login-render assertion fails**

Run: `npm test -- src/lib/audit-format.test.ts`
Expected: the new "login action" test FAILS — current fallback renders `"auth · login: יוסי"`, which contains "יוסי" but NOT "התחברות". (The `auditHref` auth test already passes via the existing `null` fallback — that's fine.)

- [ ] **Step 3: Implement the renderer case**

In `src/lib/audit-format.ts`, add this block in `describeAudit` immediately before the final `return { before: ... fallback`:

```ts
  if (e.entityType === "auth" && e.action === "login") {
    return { before: "התחברות למערכת: ", label: name, after: "" };
  }
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -- src/lib/audit-format.test.ts`
Expected: PASS (all auditSentence + auditHref tests, including the two new ones).

- [ ] **Step 5: Widen the audit type unions**

In `src/lib/audit.ts`, change:

```ts
export type AuditAction =
  | "create"
  | "update"
  | "deactivate"
  | "reactivate"
  | "delete"
  | "login";
```

and:

```ts
  entityType: "candidate" | "suggestion" | "membership" | "community" | "auth";
```

- [ ] **Step 6: Add the filter options**

In `src/components/ActivityFilters.tsx`:

`ENTITY_OPTIONS` — add after the `community` entry:
```ts
  { value: "auth", label: "התחברויות" },
```

`ACTION_OPTIONS` — add after the `delete` entry:
```ts
  { value: "login", label: "התחברות" },
```

- [ ] **Step 7: Verify + commit**

Run: `npx tsc --noEmit && npm test && npm run build` → all green.
```bash
git add src/lib/audit.ts src/lib/audit-format.ts src/lib/audit-format.test.ts src/components/ActivityFilters.tsx
git commit -m "feat(login-audit): render + filter login events; widen audit types"
```

---

## Task 2: `recordLogin` helper + NextAuth wiring

**Files:** Create `src/lib/audit-login.ts`; Modify `src/lib/auth.ts`

- [ ] **Step 1: Create the helper**

Create `src/lib/audit-login.ts`:

```ts
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
```

- [ ] **Step 2: Wire `events.signIn` in `auth.ts`**

In `src/lib/auth.ts`, add an `import` at the top:
```ts
import { recordLogin } from "@/lib/audit-login";
```

Add an `events` block to the `NextAuth({...})` config object, immediately after the closing of the `callbacks: { ... }` block (sibling key):

```ts
  events: {
    async signIn({ user }) {
      if (user?.id) {
        await recordLogin({ id: user.id, name: user.name, email: user.email });
      }
    },
  },
```

(The `NextAuth({...})` object currently ends `callbacks: { jwt(...){...}, session(...){...} } });` — insert `events` between the `callbacks` block's closing `},` and the final `});`.)

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit && npm run build` → green. (`events.signIn`'s `user` is typed by Auth.js; `user.id` is `string` on the User type this project already augments — confirm tsc passes.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/audit-login.ts src/lib/auth.ts
git commit -m "feat(login-audit): record a login audit row per community on sign-in"
```

---

## Task 3: Verification

- [ ] **Step 1: Full regression**

Run: `npx tsc --noEmit && npm test && npm run build` → all green.

- [ ] **Step 2: Manual (browser, `npm run dev`)**

1. Sign out, then sign back in (Google or magic-link).
2. As an admin, open `/app/activity` → a **"התחברות למערכת: ‹name›"** entry appears at the top, attributed to the signing-in user, for each community they belong to.
3. Set פעולה = **התחברות** (and/or סוג = **התחברויות**) → only login entries show; clear → all events show.
4. Sanity: the login itself completes normally (the audit write is a non-blocking side-effect).

- [ ] **Step 3: Confirm non-blocking behavior (reasoning + optional)**

`recordLogin` wraps everything in try/catch and logs to console, so a DB hiccup can't fail the sign-in. Optionally confirm locally by temporarily throwing at the top of `recordLogin` and verifying login still succeeds (revert after).

---

## Self-Review

**Spec coverage:**
- §1 `recordLogin` (per-community fan-out, plain `db`, try/catch, zero-membership ok) → Task 2 Step 1. ✔
- §2 NextAuth `events.signIn` wiring → Task 2 Step 2. ✔
- §3 type extension (`auth`, `login`) → Task 1 Step 5. ✔
- §4 rendering "התחברות למערכת: ‹name›" + `auditHref` null → Task 1 Steps 1-4. ✔
- §5 filter options (`auth` entity, `login` action) → Task 1 Step 6. ✔
- §6 no schema change → confirmed (no migration task). ✔
- §7 testing (unit describeAudit + manual) → Task 1 (TDD) + Task 3. ✔

**Placeholder scan:** No TBD/TODO; every code step has complete code. The `auth.ts` insertion point is described precisely against the current file structure.

**Type consistency:** `recordLogin(user: {id,name?,email?})` matches the `events.signIn` call site `{id: user.id, name: user.name, email: user.email}`. `writeAudit` call uses `entityType:"auth"` + `action:"login"`, both added to the unions in Task 1 Step 5 (Task 1 precedes Task 2, so the types exist before `recordLogin` references them). Filter `value`s (`"auth"`, `"login"`) match the renderer's `entityType`/`action` checks.
