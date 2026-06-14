# pairmaker

A Hebrew/RTL shidduch (matchmaking) app for communities. Members manage **candidates** and propose
**suggestions** (matches) between them. Multi-tenant by **community**; per-community **memberships**
carry a role (`admin` | `member`). All UI text is Hebrew, layout is RTL.

## Stack

- **Next.js 15** (App Router, `--turbopack`), **React 19**, TypeScript.
- **Prisma 6** + **Neon** (Postgres serverless, `@prisma/adapter-neon`). Schema: `prisma/schema.prisma`.
  Migrations via `npm run db:migrate` (prisma migrate dev). Seed: `npm run db:seed` (`prisma/seed.ts`).
- **NextAuth v5 beta** (`next-auth`), Prisma adapter, SMTP magic-link login (Nodemailer) + Resend.
- **Vercel Blob** for candidate photos (private access). **Tailwind 3** (brand palette `brand-*`).
- **Vitest** for unit tests (`npm test`). Deployed on **Vercel**.
- ⚠️ After any `npm install`, run `npm run fix-lock` or Vercel deploys break (mirror-only registry).

## Architecture

### Field registry — the heart of candidate data (`src/lib/fields.ts`)
`FIELDS: FieldDef[]` is a single declarative registry that drives the candidate **form**, **search
panel**, and **profile display**. Each field declares: `type` (text|longtext|number|select|multiselect|boolean),
`storage` (`column` = real Prisma column | `details` = key in the `Candidate.details` JSONB blob),
`options`, `searchable`, `showInCard`, `group`. `buildCandidateInput(raw)` validates+splits form data
into `{columns, details, errors}`. To add a candidate attribute you usually just add a `FieldDef`
(JSONB-stored fields need **no migration**). NOTE: `boolean` is declared in `FieldType` but **not yet
implemented** in the form, search, or `buildCandidateInput` — adding a real boolean field requires wiring those.

### Search (`src/lib/candidate-search.ts`)
`buildCandidateWhere(params, communityId)` turns URL search params into a Prisma `where`. Quick search
(`q`) does a case-insensitive OR over name/occupation/city. Advanced filters are generated from
`SEARCHABLE_FIELDS`: number → min/max range, select → equals, text → contains. JSONB (`details`) fields
use Prisma `path`/`string_contains`. Helpers: `hasActiveFilters`, `describeActiveFilters` (filter chips),
`paramsToQuery`. UI: `src/components/SearchPanel.tsx` (quick input + slide-over advanced drawer).

### Permissions (`src/lib/permissions.ts`)
`can(role, action)` — role-based only. `member` can create/edit/deactivate/delete candidates +
manage suggestions; `admin` adds `member:manage` + `audit:view`. ⚠️ There is currently **no
per-candidate ownership** check — any member can edit any candidate in their community.

### Candidate display (`src/lib/candidate-display.ts`)
`displayAge(c)` prefers `birthdate` (computed) then falls back to `ageManual`. `ageLabel(gender, age)`
→ gendered "בן 30"/"בת 27". `statusLabel` → gendered active/inactive.

### Photos
Pipeline: `PhotoPicker.tsx` (client) downscales to ≤1280px JPEG → `POST /api/candidates/photo`
(`src/app/api/candidates/photo/route.ts`) stores to Blob, returns a `handle` → saved as
`Candidate.photoUrl`. Served (membership-gated) via `GET /api/candidates/[id]/photo`.
`src/lib/blob.ts` (store/read/delete), `src/lib/photo.ts` (validation, type/ext). Avatars are circular
(`CandidateAvatar.tsx`, `object-cover`).

### Audit log
Every candidate/suggestion mutation writes an `AuditLog` row inside the same transaction via
`writeAudit` (`src/lib/audit.ts`); diffs computed by `computeChanges` (`src/lib/audit-diff.ts`).
Activity feed at `/app/activity`.

## Key paths
- Candidate server actions (create/update/deactivate/reactivate/delete): `src/app/app/candidates/actions.ts`
  — all call `requireMembership()` + `can()`. `loadOwned()` currently scopes by community only.
- Pages: list `src/app/app/candidates/page.tsx`, profile `[id]/page.tsx`, edit `[id]/edit/page.tsx`,
  new `new/page.tsx`, suggest `[id]/suggest/page.tsx`. Matches: `src/app/app/matches/`.
- Form `src/components/CandidateForm.tsx`, card `CandidateCard.tsx`, row `CandidateRow.tsx`.
- Auth/session: `src/lib/auth.ts`, community context: `src/lib/community.ts` (`requireMembership`),
  active community: `src/lib/active-community.ts`.

## Schema notes (`prisma/schema.prisma`)
`Candidate`: name, gender (enum), `birthdate?` + `ageManual?` (both exist; only `ageManual` exposed in
form as "גיל"), occupation, heightCm, city, `requirements` (Text), `photoUrl`, `details` (JSONB),
`status` (active|inactive) + deactivation fields, `createdById`. Phase-2 provenance fields
(sourceMessageId/rawText/parsedJson) are present but unused. `Suggestion` enforces one per unordered
pair via `pairKey`.

## Conventions
- Hebrew UI strings inline; RTL (`dir="rtl"`). Brand Tailwind palette.
- **Gender-matched language:** when displaying data about a candidate, match the wording to the
  candidate's gender — e.g. מעשן (male) / מעשנת (female), בן/בת, פעיל/פעילה. Centralize gendered phrasing
  in `src/lib/candidate-display.ts` (see `ageLabel`, `statusLabel`) and reuse it rather than inlining.
- Server Actions for mutations (`"use server"`), `revalidatePath` + `setFlash` for toasts after.
- Tests colocated as `*.test.ts` in `src/lib/`. Prefer extending the field registry over bespoke UI.
