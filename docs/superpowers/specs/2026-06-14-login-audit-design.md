# Login Audit Logging — Design

**Date:** 2026-06-14
**Status:** Design approved, ready for implementation plan
**Feature:** Record a `login` audit-log entry whenever a user signs in

## Goal

Every successful sign-in (Google or email magic-link) is recorded in the audit
log so community admins can see member login activity in the activity viewer.

## Decisions (from brainstorming)

- **Attribution:** one `login` audit row **per community the user belongs to**
  (no schema change; `AuditLog.communityId` stays required). Single-community
  users get one row.
- **Hook:** NextAuth v5 `events.signIn` — fires once per successful sign-in for
  all providers, gives the `user`, and is fire-and-forget (can't block login).
- **No signup distinction:** every sign-in records `action: "login"`. `isNewUser`
  is unreliable here because users are pre-created via "add member" before their
  first login, so distinguishing signup would misfire.
- **Non-blocking:** a failed audit write must never break sign-in.

## Architecture

```
NextAuth events.signIn({ user })  --->  recordLogin(user)
                                          ├─ find user's memberships
                                          └─ writeAudit() one "login" row per community
activity viewer (/app/activity)  --->  describeAudit renders "התחברות למערכת: <name>"
ActivityFilters                  --->  new "auth" entity + "login" action filter options
```

## 1. `recordLogin` helper

New `src/lib/audit-login.ts`:

```ts
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function recordLogin(user: { id: string; name?: string | null; email?: string | null }): Promise<void> {
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

- Uses the plain `db` client (post-login side-effect, not inside a transaction).
- Swallows all errors — login must succeed regardless.
- A user with no memberships (just signed up, not yet added to a community)
  produces zero rows — acceptable; they'll be audited on later logins once added.

## 2. NextAuth wiring (`src/lib/auth.ts`)

Add an `events` block to the `NextAuth({...})` config (sibling of `callbacks`):

```ts
events: {
  async signIn({ user }) {
    if (user?.id) await recordLogin({ id: user.id, name: user.name, email: user.email });
  },
},
```

## 3. Audit type extension (`src/lib/audit.ts`)

Widen the `AuditInput` unions:
- `entityType`: add `"auth"` → `"candidate" | "suggestion" | "membership" | "community" | "auth"`.
- `AuditAction`: add `"login"` → existing actions plus `"login"`.

`writeAudit` already hardcodes `source: "user"`, which is correct for a real
user logging in. No other change to `writeAudit`.

## 4. Rendering (`src/lib/audit-format.ts`)

Add a case in `describeAudit` before the fallback:

```ts
if (e.entityType === "auth" && e.action === "login") {
  return { before: "התחברות למערכת: ", label: name, after: "" };
}
```

`auditHref` already returns `null` for any non-candidate/suggestion type, so the
login name renders as plain text (no link) — correct, there's no entity page.

## 5. Activity filters (`src/components/ActivityFilters.tsx`)

- Add to `ENTITY_OPTIONS`: `{ value: "auth", label: "התחברויות" }`.
- Add to `ACTION_OPTIONS`: `{ value: "login", label: "התחברות" }`.

This lets admins filter logins in or out — the noise valve, since logins will be
the most frequent event. No change to the filtering logic (the activity page
already filters by `entityType`/`action` query params).

## 6. Schema

No change. `AuditLog` already stores `entityType`/`action` as free strings; the
TypeScript unions are the only typing, widened in §3.

## 7. Testing & verification

- **Unit (Vitest, pure):** extend `audit-format` tests — `describeAudit({entityType:"auth", action:"login", entityLabel:"X"})` renders `"התחברות למערכת: X"`; `auditSentence` likewise.
- **Manual (browser):**
  1. Log out and back in → an admin sees a "התחברות למערכת: ‹name›" entry in
     `/app/activity` for each community the user belongs to.
  2. Filter by פעולה = התחברות (and סוג = התחברויות) → only login entries show.
  3. Login still succeeds even if the audit write fails (verified by reasoning /
     try-catch; optionally force an error locally).

## Out of scope / non-goals

- Logout auditing (only logins).
- Retention/pruning of login rows (flagged as a possible future addition if the
  log gets noisy; not built here).
- IP / device / user-agent capture.
- Distinguishing first-ever signup from login.
