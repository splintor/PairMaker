# Candidate feature batch — design

Date: 2026-06-14

Six beta-feedback feature requests for the candidate experience. They are independent but several
touch the shared field registry (`src/lib/fields.ts`), so they ship as one spec/plan.

## Global convention (applies to all display work below)

When showing data about a candidate, **match the wording to the candidate's gender**:
male → מעשן, female → מעשנת; likewise בן/בת, פעיל/פעילה. Centralize gendered phrasing in
`src/lib/candidate-display.ts` and reuse — do not inline gender branching in components.

## Cross-cutting engine changes (`src/lib/fields.ts`)

1. **New `storage: "virtual"`** — a `FieldDef` that renders in form/search/profile UI but is not
   persisted directly; the action and search layers map it to a real column. Used only by `age` (#2).
   `buildCandidateInput` skips virtual fields (no column/detail write).
2. **Implement the `boolean` type** (declared in `FieldType` today but unwired):
   - `buildCandidateInput`: boolean is resolved to `true`/`false` and **never skipped** (an unchecked
     box is a real `false`, not "missing"). Boolean is handled before the select-options validation.
   - `details` value type widened to include `boolean`.

## #1 — Photo crop (react-easy-crop)

- Add dependency `react-easy-crop`; run `npm run fix-lock` afterward (mirror-only registry).
- `src/components/PhotoPicker.tsx`: after a file is selected and passes `validatePhotoUpload`, open a
  **crop modal** (React overlay — never a native `alert/confirm`). The modal uses `react-easy-crop`
  with `aspect={1}`, `cropShape="round"`, a zoom slider, and drag-to-pan.
  - **שמירה**: draw `croppedAreaPixels` to a `<canvas>`, scale the square to ≤512px longest edge,
    export `image/jpeg` (~0.85), upload via the **existing** `POST /api/candidates/photo` pipeline,
    set preview + hidden `photoUrl` handle.
  - **ביטול**: close modal, no change.
  - The current `downscale()` is replaced by a `cropToSquare(image, areaPixels)` helper.
- No server/schema change — same blob handle is stored in `photoUrl`.

## #2 — Age → birthdate

- **Schema (`prisma/schema.prisma`):** remove `ageManual`. Keep `birthdate DateTime?`.
- **Migration:** for existing rows (test data only) assign a **random `birthdate`**, then drop the
  `ageManual` column. No real age→date back-conversion needed.
- **Form:** keep a number field labeled **"גיל"**, now declared as `{ key: "age", type: "number",
  storage: "virtual", group: "כללי", searchable: true }`. On create/update the action computes
  `birthdate = new Date(currentYear − age, currentMonth, currentDay)` (today's month/day so the shown
  age stays stable until the next birthday). Empty age → `birthdate = null`. Invalid age → validation error.
- **Edit page:** seed the form's `age` value via `displayAge(candidate)`.
- **`displayAge` (`candidate-display.ts`):** simplify to birthdate-only (drop the dead `ageManual` path).
- **List card / row:** unchanged — already shows age only via `ageLabel` ("בן 30" / "בת 27").
- **Profile age field:** renders `30 (שנת לידה: 1996)` (year from `birthdate.getUTCFullYear()`).
- **Search:** `age` min/max maps to a `birthdate` range —
  `lte = Date(curYear − ageMin, m, d)`, `gte = Date(curYear − ageMax, m, d)`.
- **`prisma/seed.ts`:** set `birthdate` from a sample age instead of `ageManual`.

## #3 — Sector options (`fields.ts`, no migration — JSONB `details`)

Append to the `sector` field options:
- `{ value: "dati_leumi_torani", label: "דתי לאומי תורני" }`
- `{ value: "dati_patuach", label: "דתי פתוח" }`
- `{ value: "datlash", label: "דתל\"ש" }`

## #4 — Ownership: all candidate mutations owner-only

- `src/lib/permissions.ts`: add
  `canEditCandidate(role, userId, candidate)` → `role === "admin" || candidate.createdById === userId`.
- `src/app/app/candidates/actions.ts`: `loadOwned()` becomes ownership-enforcing (redirects a member
  who is not the creator). It already gates `updateCandidate`, `deactivateCandidate`,
  `reactivateCandidate`, `deleteCandidate`. `createCandidate` stays open to all members.
- **Profile page (`[id]/page.tsx`):** hide Edit / deactivate / reactivate / delete controls for
  non-owner members. The **+ הצעת שידוך** (suggest) action stays available to everyone who can view.
- **Edit page (`[id]/edit/page.tsx`):** server-side guard — redirect non-owners to the profile.
- Members can still **view** and **propose suggestions** involving candidates added by others.

## #5 — Requirements in search (`דרישות לבן/בת הזוג`)

- Add `requirements` to the quick-search OR in `buildCandidateWhere` (alongside name/occupation/city),
  case-insensitive `contains`.
- Flip `requirements` to `searchable: true` so it appears in the advanced panel.
- Add `longtext` handling in `buildCandidateWhere` (same as `text` → `contains`). `SearchPanel`'s
  default branch already renders a text input for it.
- Update the quick-search placeholder to reflect that requirements are searched.

## #6 — Smoking (boolean, `details` JSONB — no migration)

- New field: `{ key: "smoking", label: "עישון", type: "boolean", storage: "details", group: "רקע",
  searchable: true, showInCard: true, options: [{value:"true",label:"מעשן/ת"},{value:"false",label:"לא מעשן/ת"}] }`
  (options drive the search select only).
- **Form:** checkbox (Input gains a `boolean` branch).
- **Search:** tri-state Select — הכל (empty) / מעשן/ת / לא מעשן/ת. `buildCandidateWhere` boolean branch:
  `"true"` → `details.path equals true`, `"false"` → `equals false`. `describeActiveFilters` gains a
  boolean chip.
- **Profile:** `valueFor` boolean branch → gendered **כן/לא** style is not needed for value itself;
  show `כן`/`לא`.
- **List card / row:** when `smoking === true`, append a gendered chip — **מעשן** (male) / **מעשנת**
  (female) — via a new `smokingLabel(gender)` helper in `candidate-display.ts`. Not shown when false.

## Testing (Vitest, colocated in `src/lib/`)

- `candidate-display.test.ts`: birthdate-only `displayAge`; profile age string `"30 (שנת לידה: 1996)"`;
  gendered `smokingLabel`.
- `fields.test.ts`: `buildCandidateInput` boolean (checked/unchecked), virtual-field skipping, new
  sector options accepted.
- `candidate-search.test.ts`: age range → birthdate range; requirements in quick search + advanced;
  boolean equals filter.
- `permissions.test.ts`: `canEditCandidate` (admin, owner, non-owner member).

## Out of scope

- No change to suggestions/matches beyond keeping suggest open to all viewers.
- No backfill of meaningful ages for existing rows (random birthdate is acceptable for test data).
