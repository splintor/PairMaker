# M6 — Polish Pass (responsive, empty states, feedback, RTL, a11y)

**Date:** 2026-06-13
**Status:** Design approved, ready for implementation plan
**Milestone:** M6 (final polish before Phase 2 / bot)

## Goal

Take PairMaker from "feature-complete" (through M5) to "feels finished" with a full
polish pass: a real mobile experience, friendly empty states, mutation feedback,
loading states, an accessibility sweep, and RTL correctness. No new product features.

## Approach

Approach A (chosen): build a small set of reusable Tailwind primitives that match the
existing hand-rolled `ui.tsx` style, keep the server-component architecture intact, and
add small client islands only where interaction requires it. One new dependency:
**`sonner`** for toasts (RTL-friendly, ~4KB). Rejected: shadcn/ui (introduces a second
styling convention + Radix for a polish milestone) and zero-JS CSS-only nav (worse
focus management and feedback — the exact things a polish pass should fix).

## Scope

Full polish pass:
1. Responsive / mobile (nav drawer + filters drawer)
2. Empty states (icon + text + action button)
3. Loading states (route skeletons + pending submit buttons)
4. Toasts / mutation feedback
5. Accessibility sweep
6. RTL nits

Out of scope: new features, the Phase 2 bot, redesign of existing screens beyond polish.

---

## 1. New shared primitives (`src/components`)

### `EmptyState.tsx` (server component)
Props: `{ icon: ReactNode; title: string; hint?: string; action?: ReactNode }`.
Centered column: large emoji/icon, bold Hebrew `title`, optional muted `hint`, optional
`action` (a `LinkButton` / `PrimaryButton`). Replaces the six ad-hoc empty texts so all
empty states look identical.

### `MobileNav.tsx` (client component — needs open/close state)
- Renders a `☰` trigger button (aria-label `תפריט`).
- Right-anchored slide-in drawer (RTL-correct) + dimmed backdrop.
- Contents: nav links (מועמדים / שידוכים / הגדרות — הגדרות only for admins),
  `CommunitySwitcher`, the user identity block, and the sign-out form.
- Behavior: open on trigger; close on backdrop click, Esc, or link navigation.
  Scroll-lock body while open; focus moves into the drawer on open and is trapped;
  focus returns to the trigger on close.
- Receives the same `ctx: ActiveContext` data `TopNav` already has (passed as props so
  the drawer stays presentational; sign-out remains a server-action form).

### `Skeleton.tsx` (server component)
Simple `animate-pulse` rounded block with a `className` passthrough; composed into the
per-route loading files (section 3).

### Toaster (sonner)
Mount `<Toaster dir="rtl" position="top-center" richColors />` once in the app shell
(`src/app/app/layout.tsx` if present, else the root layout). Paired with `FlashToasts`
(section 4).

---

## 2. Responsive navigation

`TopNav` stays a server component. Tailwind responsive split at the `md` breakpoint:
- **< md:** hide the inline nav links + switcher + user block; show the logo + `<MobileNav>`.
- **≥ md:** unchanged from today.

The drawer slides from the **right** (RTL). The logo (`💞 PairMaker`) is always visible.
`<nav>` gets `aria-label="ראשי"`.

---

## 3. Filters drawer (mobile) + loading states

### Filters drawer
`SearchPanel` / `FilterChips`:
- **≥ md:** unchanged (filters inline).
- **< md:** filters collapse behind a **`סינון`** button that opens a drawer using the
  same pattern as `MobileNav`. Active `FilterChips` remain rendered **above the list** at
  all breakpoints, so applied filters are never hidden behind the drawer.

### Loading states
- Add `loading.tsx` (React Suspense + `Skeleton`) for the data-heavy segments:
  `app/candidates`, `app/candidates/[id]`, `app/matches`, `app/activity`.
  Each skeleton mirrors the rough shape of its page (e.g. a column of card/row blocks).
- Submit buttons reflect pending state via `useFormStatus` (a `PendingButton` wrapper or
  extension of `PrimaryButton`): disabled + inline spinner while the action runs. Applies
  to candidate save/delete/deactivate, match suggest/status-change/delete, member
  add/edit/role/remove, community create/rename.

---

## 4. Empty states

Applied via `<EmptyState>` at each location found in the codebase:

| Screen (file) | Icon | Title | Action |
|---|---|---|---|
| Candidates list, no data (`app/candidates/page.tsx`) | 👤 | אין עדיין מועמדים | **הוסף מועמד** → `/app/candidates/new` |
| Candidates list, no search results (`app/candidates/page.tsx`) | 🔍 | לא נמצאו מועמדים התואמים את החיפוש | **נקה סינון** |
| Candidate → suggestions (`app/candidates/[id]/page.tsx`) | 💡 | אין הצעות עדיין | **הצע שידוך** |
| Suggest page (`app/candidates/[id]/suggest/page.tsx`) | 🤝 | אין מועמדים מתאימים | **נקה סינון** |
| Matches board (`app/matches/page.tsx`) | 💞 | אין הצעות שידוך עדיין | **עבור למועמדים** → `/app/candidates` |
| Activity log (`app/activity/page.tsx`) | 📋 | אין רשומות התואמות את הסינון | **נקה סינון** |

"No data" vs "no results from a filter" is distinguished only where the page already
knows the difference (candidates list: empty result while filters are active → 🔍 + נקה
סינון; otherwise → 👤 + הוסף מועמד). All use the single `EmptyState` component.
`no-community/page.tsx` already has a styled empty state; align its markup to
`EmptyState` for consistency.

---

## 5. Toasts / mutation feedback

Server actions cannot call a client toast directly. Pattern:
- On success/failure, a server action sets a short-lived **`flash` cookie**
  (`{ type: "success" | "error", message: string }`, `httpOnly: false`, `maxAge` a few
  seconds) before its `redirect(...)`.
- A small client `<FlashToasts>` mounted in the app shell reads the cookie on mount,
  fires the matching `sonner` toast, and clears the cookie.
- A tiny helper (`src/lib/flash.ts`) wraps set/read/clear so actions stay one-liners.

Covered mutations with Hebrew copy (success + error):
candidate create / edit / delete / deactivate; match suggest / status-change / delete;
member add / edit / role-change / remove; community create / rename. Existing
`?error=...` query-param flows (e.g. `?error=validation`, `?error=lastadmin`) are
converted to flash toasts so feedback is consistent.

---

## 6. Accessibility sweep

- `focus-visible` ring utility applied to all interactive elements (buttons, links,
  `Select`, chips).
- `aria-label` on every icon-only control (☰ trigger, delete-icon buttons, view toggle).
- Drawer focus management as specified in §1 (trap, Esc, restore, scroll-lock).
- Verify `Select.tsx` keyboard support: arrow-key navigation, Enter to select, Esc to
  close, and correct `role`/`aria-expanded`/`aria-activedescendant`.
- Semantic landmarks: `<nav aria-label>`, a single `<main>` wrapping page content.

---

## 7. RTL nits

- Audit physical-direction Tailwind utilities (`ml-`/`mr-`, `pl-`/`pr-`, `left-`/`right-`,
  `text-left`/`text-right`) and switch to logical equivalents (`ms-`/`me-`, `ps-`/`pe-`,
  `start-`/`end-`, `text-start`/`text-end`) wherever the physical side was only chosen for
  LTR.
- Confirm any directional glyphs (chevrons/arrows in `Select`, switcher, links) point the
  RTL-correct way.
- Confirm drawers anchor right and `sonner` toasts render correctly under `dir="rtl"`.

---

## 8. Verification

- Manual pass in Chrome at **375px (mobile)** and **desktop**: nav drawer open/close +
  focus + Esc; filters drawer; every empty state; a toast on at least one mutation per
  action file; loading skeleton on a throttled navigation.
- Automated: the project has Vitest (`npm test`). Add render tests for `EmptyState`
  (renders title/action) and `MobileNav` (toggles open/closed, Esc closes). Skip
  exhaustive UI tests — manual breakpoint verification is the primary check for layout.

## Affected files (indicative)

- New: `src/components/EmptyState.tsx`, `MobileNav.tsx`, `Skeleton.tsx`,
  `FilterDrawer` (or extend `SearchPanel`), `FlashToasts.tsx`, `src/lib/flash.ts`,
  `loading.tsx` × 4.
- Edited: `TopNav.tsx`, `SearchPanel.tsx`, `FilterChips.tsx`, `Select.tsx`, `ui.tsx`
  (PendingButton + focus ring), the six empty-state pages, the four `actions.ts` files
  (flash on mutate), app shell layout (Toaster + FlashToasts), `globals.css` if a shared
  focus-ring utility is added.

## Non-goals / notes

- Phase 2 (bot) writes through the same `writeAudit` with `source: "bot"`; nothing here
  blocks it.
- No dependency beyond `sonner`.
