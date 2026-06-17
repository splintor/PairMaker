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
`storage` (`column` = real Prisma column | `details` = key in the `Candidate.details` JSONB blob |
`virtual` = shown in UI but mapped to a real column by the caller — only `age`→`birthdate` uses this),
`options`, `searchable`, `showInCard`, `group`. `buildCandidateInput(raw)` validates+splits form data
into `{columns, details, errors}` (skips virtual fields; booleans always resolve to true/false, never
skipped). To add a candidate attribute you usually just add a `FieldDef` (JSONB-stored fields need
**no migration**). The `boolean` type is fully wired (form checkbox, tri-state search select, profile
כן/לא); `smoking` is the first boolean field. The candidate name is split into `firstName` + `lastName`
fields (both required); the action denormalizes them into the `name` column (kept for search/display/
suggestions), so most code keeps using `name`.

### Search (`src/lib/candidate-search.ts`)
`buildCandidateWhere(params, communityId)` turns URL search params into a Prisma `where`. Quick search
(`q`) does a case-insensitive OR over name/occupation/city. Advanced filters are generated from
`SEARCHABLE_FIELDS`: number → min/max range, select → equals, text → contains. JSONB (`details`) fields
use Prisma `path`/`string_contains`. Helpers: `hasActiveFilters`, `describeActiveFilters` (filter chips),
`paramsToQuery`. UI: `src/components/SearchPanel.tsx` (quick input + slide-over advanced drawer).

### Permissions (`src/lib/permissions.ts`)
`can(role, action)` — role-based. Plus `canEditCandidate(role, userId, candidate)`: members may
**mutate** (edit/deactivate/reactivate/delete) only candidates they created; admins mutate any. All
members may still **view** and **propose suggestions** for any candidate in their community. Enforced
in `actions.ts` (`loadOwned`), the profile page (gated controls), and the edit page (redirect guard).

### Candidate display (`src/lib/candidate-display.ts`)
`displayAge(c)` computes age from `birthdate` (the only age source). `ageToBirthdate(age)` is the
inverse used on save and in age-range search. `ageWithBirthYear(c)` → "30 (שנת לידה: 1996)" (profile).
`ageLabel(gender, age)` → gendered "בן 30"/"בת 27" (cards). `smokingLabel(gender)` → מעשן/מעשנת.
`creatorLabel(createdBy)` → name ?? email ?? "—" (the "נוסף ע״י …" byline on list/card/profile; the
list query must `include: { createdBy: { select: { name, email } } }`). `statusLabel` → gendered
active/inactive. Age is entered as a number in the form and converted to a birthdate (today's
month/day, year = currentYear − age) by the server action.

### Photos
A candidate has up to `MAX_PHOTOS` (5) photos: `Candidate.photos` (ordered blob handles) with
`photoUrl` mirroring `photos[0]` (the primary/avatar) so single-photo code is unchanged. Pipeline:
`PhotoPicker.tsx` (client, multi-photo: add/remove/"make primary") → `POST /api/candidates/photo`
(`src/app/api/candidates/photo/route.ts`, blocked-user gated) stores to Blob, returns a `handle`;
the form submits the ordered handles as a JSON array in a hidden input and the action sets
`photos`/`photoUrl` (deleting dropped blobs). Served (membership-gated) via
`GET /api/candidates/[id]/photo` — default serves the primary, `?h=<handle>` serves a specific photo
validated against `photos`. `candidatePhotoSrc` (primary) / `candidatePhotoSrcByHandle` (a photo).
Profile shows a `PhotoGallery.tsx` thumbnail strip + lightbox. `src/lib/blob.ts`, `src/lib/photo.ts`.
On select, `PhotoCropModal.tsx` (react-easy-crop) does a 1:1 crop; the cropped ≤512px JPEG is uploaded.

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
- Auth/session: `src/lib/auth.ts` (**JWT** sessions). Community context: `src/lib/community.ts`
  (`requireMembership` — sources `userName`/`userEmail` from the DB, not the JWT, so name changes show
  in the top bar). Active community: `src/lib/active-community.ts`.
- Settings (`src/app/app/settings/`): admins (`member:manage`) add members (name **required**) and
  rename any member (`setMemberName`) — `User.name` is global to the person across communities. Each
  member row has a `MemberActionsMenu` (kebab): email invite, WhatsApp invite (when a phone exists),
  block/unblock (`setMemberBlocked`), remove. WhatsApp invite reuses the magic sign-in link —
  `captureMagicLink` (in `auth.ts`) hands the URL to the client instead of emailing it.
- **Global block:** `User.blockedAt` bars a user from the whole app. `requireMembership` (and the photo
  upload route) redirect a blocked user to `/blocked` (top-level, outside `/app`) even mid-session.
  Admin-only; can't block yourself.

## Schema notes (`prisma/schema.prisma`)
`Candidate`: `name` (denormalized full name) + `firstName`/`lastName`, gender (enum), `birthdate?`
(stores year-of-birth; the form's "גיל" age input is converted to it on save — `ageManual` was removed),
occupation, heightCm, city, `requirements` (Text), `photoUrl` (= `photos[0]`), `photos` (String[]),
`details` (JSONB; holds `sector`, `education`, `smoking`, …), `status` (active|inactive) + deactivation
fields, `createdById`. Phase-2 provenance fields (sourceMessageId/rawText/parsedJson) are present but
unused. `User.blockedAt?` is a global block flag. `Suggestion` enforces one per unordered pair via `pairKey`.

## Conventions
- **Workflow:** single-developer project — do **not** use feature branches. Commit directly to `main`,
  divided into small, logical commits. Push when asked.
- Hebrew UI strings inline; RTL (`dir="rtl"`). Brand Tailwind palette.
- **Gender-matched language:** when displaying data about a candidate, match the wording to the
  candidate's gender — e.g. מעשן (male) / מעשנת (female), בן/בת, פעיל/פעילה. Centralize gendered phrasing
  in `src/lib/candidate-display.ts` (see `ageLabel`, `statusLabel`) and reuse it rather than inlining.
- Server Actions for mutations (`"use server"`), `revalidatePath` + `setFlash` for toasts after.
- Tests colocated as `*.test.ts` in `src/lib/`. Prefer extending the field registry over bespoke UI.
