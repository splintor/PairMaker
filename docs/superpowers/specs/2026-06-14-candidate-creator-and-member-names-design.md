# Candidate creator attribution + member names — design

Date: 2026-06-14

Show which member added each candidate (in the list and on the card), and let admins set member
names (shown in the top bar). The app uses **JWT sessions**, so a user's name is baked into the token
at sign-in — the top bar must read the name from the DB to reflect changes.

## 1. "Added by" attribution (list + card)

- **List query** (`src/app/app/candidates/page.tsx`): the candidate list does not currently load the
  creator. Add `include: { createdBy: { select: { name: true, email: true } } }` to the `findMany`.
- **Helper** `creatorLabel(createdBy)` in `src/lib/candidate-display.ts`:
  `createdBy?.name ?? createdBy?.email ?? "—"` — falls back to email for members who have no name yet.
- **`CandidateCard`** (`src/components/CandidateCard.tsx`): a muted line `נוסף ע״י {creatorLabel}`
  below the status pill.
- **`CandidateRow`** (`src/components/CandidateRow.tsx`): a muted trailing label
  `נוסף ע״י {creatorLabel}` placed before the status pill.
- **Profile page** (`[id]/page.tsx`): already shows `נוסף ע״י …`; switch it to use `creatorLabel`
  for consistency.
- **Component prop types**: `CandidateCard`/`CandidateRow` change from `c: Candidate` to
  `c: Candidate & { createdBy: { name: string | null; email: string | null } | null }`.

## 2. Name in the top bar (JWT freshness)

`requireMembership` (`src/lib/community.ts`) currently sets `userName`/`userEmail` from
`session.user` (the JWT, stale after a name change). Change it to source them from the DB by extending
the **existing** membership query — no extra round-trip:

```ts
const rows = await db.membership.findMany({
  where: { userId: session.user.id },
  include: { community: true, user: { select: { name: true, email: true } } },
  orderBy: { createdAt: "asc" },
});
// after the rows.length === 0 redirect:
const me = rows[0].user;
// userName: me.name ?? null, userEmail: me.email ?? null
```

`TopNav` already renders `ctx.userName ?? ctx.userEmail`, so it needs no change — a freshly-set name
appears on the next navigation.

## 3. Admins set member names (Settings)

Name is **required** (not optional).

- **`addMember`** (`src/app/app/settings/actions.ts`): require a non-empty `name` alongside `email`.
  Set it when creating the user, and update it on an existing user:
  `tx.user.upsert({ where: { email }, update: { name }, create: { email, name } })`. Reject a blank
  name with a flash error.
- **New `setMemberName(membershipId, formData)`**: admin-only (`member:manage`). Loads the membership
  scoped to `ctx.communityId`, validates a non-empty name, updates `User.name`, and writes an audit
  log (`entityType: "membership"`, `action: "update"`, `changes: { name: { from, to } }`). No-ops if
  unchanged. Works for any member — self, other admins, regular members (no last-admin guard; it's
  only a name).
- **Settings page** (`src/app/app/settings/page.tsx`):
  - Add a required name input to the add-member form (before email).
  - Each member row gets an inline `setMemberName.bind(null, m.id)` form: a name text field
    (defaulted to the current name) + a save button.

Note: `User.name` is global to the person, so a change applies across every community they belong to —
expected behavior.

## 4. Testing

- `src/lib/candidate-display.test.ts`: `creatorLabel` — returns name when present, email when no name,
  "—" when neither.
- Member-management authorization is already covered by the `member:manage` capability and existing
  `permissions.test.ts`.

## Out of scope

- No change to the sign-in / token flow itself; staleness is handled by reading the name from the DB.
- No bulk/CSV member import; names are set per-member in Settings.
