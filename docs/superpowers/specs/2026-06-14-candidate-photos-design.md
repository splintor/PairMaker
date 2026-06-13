# Candidate Photos — Design

**Date:** 2026-06-14
**Status:** Design approved, ready for implementation plan
**Feature:** Single, access-controlled photo per candidate

## Goal

Let matchmakers attach one photo to a candidate, uploaded from the candidate
add/edit form. Photos are private — viewable only by logged-in members of the
candidate's community. When no photo is set, the existing initial-letter avatar
is shown.

## Decisions (from brainstorming)

- **Single photo** per candidate, stored in the existing `Candidate.photoUrl` column.
- **Access-controlled** storage: private Vercel Blob + an authenticated serving route.
- **Upload in the candidate form** (add + edit); upload fires immediately on file
  select, keyed by a random id so it works before the candidate is saved.
- **Approach A** (server upload route), not client `handleUpload` — simpler and
  testable on localhost.

## Architecture

```
PhotoPicker (client) --POST /api/candidates/photo--> private Vercel Blob
   selects file, downscales (canvas), uploads, stores blob handle in hidden input
CandidateForm --submit photoUrl--> createCandidate/updateCandidate --> Candidate.photoUrl
CandidateAvatar (display) --<img src=/api/candidates/[id]/photo>--> serving route
   serving route: auth + community check --> stream private blob
```

## 1. Storage & configuration

- Add dependency **`@vercel/blob`**.
- Requires a **Vercel Blob store** and env var **`BLOB_READ_WRITE_TOKEN`** in both
  local `.env` and Vercel (Production). This is a one-time manual provisioning step
  (documented in the plan); the feature cannot run end-to-end without it.
- Blob object key: `candidates/<cuid>.<ext>` — a random id (NOT the candidate id),
  so upload works at create time before a candidate row exists.
- `Candidate.photoUrl` stores the **blob handle** (the `url`/`pathname` returned by
  `put`). It is internal — never used as a browser `src`.

**Implementation note:** private Blob read/serve is a newer `@vercel/blob` capability.
The plan must confirm the exact private `put({ access: ... })` option and the
server-side download/stream call against the installed package's types/docs before
finalizing the routes.

## 2. Upload route — `POST /api/candidates/photo`

`src/app/api/candidates/photo/route.ts`:
- `requireMembership()` — reject unauthenticated (401).
- Read the file from `multipart/form-data`.
- Validate: content-type in {`image/jpeg`,`image/png`,`image/webp`}, size ≤ 5 MB.
  On failure → 400 with a Hebrew error message.
- `put("candidates/<cuid>.<ext>", file, { access: "private", token })`.
- Respond `{ handle }` (the stored blob handle).

## 3. Serving route — `GET /api/candidates/[id]/photo`

`src/app/api/candidates/[id]/photo/route.ts`:
- `requireMembership()`.
- Load candidate by id; if missing or `candidate.communityId !== ctx.communityId`
  → 404. (Cross-community isolation, matching the rest of the app.)
- If `photoUrl` is null → 404.
- Retrieve the private blob server-side (with the token) and stream it with the
  correct `Content-Type` and a private `Cache-Control` (e.g.
  `private, max-age=300`).

## 4. Client component — `PhotoPicker`

`src/components/PhotoPicker.tsx` (client):
- Props: `{ name: string; defaultPhotoUrl?: string | null; candidateId?: string }`.
- Renders a circular preview (current photo via `/api/candidates/[id]/photo` when
  editing an existing candidate, else the picked file's object URL, else a
  placeholder) + "בחר תמונה" button + "הסר תמונה" when a photo is set.
- On file select:
  1. Validate type/size client-side (same rules as the route).
  2. **Downscale** via `<canvas>`: longest edge ≤ 1280px, export `image/jpeg`
     quality ≈ 0.85.
  3. POST the downscaled blob to `/api/candidates/photo` (multipart).
  4. On success: set the hidden input (`name={name}`) to the returned handle and
     show the preview. Show an uploading spinner during the request.
- A non-decodable image (e.g. HEIC the browser can't draw) → inline Hebrew error,
  no upload.
- "הסר תמונה" clears the hidden input (empty string → action treats as "no photo").
- Hidden input submits with the parent `<form>`.

## 5. Form + server actions

- `CandidateForm`: render `<PhotoPicker name="photoUrl" defaultPhotoUrl={values.photoUrl} candidateId={...} />`
  at the top of the form. (Add `photoUrl` to the form's `Values` type.)
- `createCandidate` / `updateCandidate` (`candidates/actions.ts`):
  - Read `photoUrl` from `formData` explicitly (it is not a `FIELDS` entry, so
    `buildCandidateInput` ignores it). Persist it on the candidate.
  - Treat empty string as `null` (photo removed).
  - **Old-blob cleanup (best-effort):** on update where the photo handle changed,
    and in `deleteCandidate`, call `del(oldHandle)` and swallow errors (never block
    the mutation on cleanup failure).
  - **Audit:** exclude `photoUrl` from the `computeChanges` diff (like `details`
    and `updatedAt` already are) so the activity log doesn't print raw blob handles.

## 6. Display — `CandidateAvatar`

`src/components/CandidateAvatar.tsx`:
- Props: `{ id: string; name: string; photoUrl?: string | null; size?: "sm" | "lg" }`.
- If `photoUrl` is set → `<img src={`/api/candidates/${id}/photo`} alt={name} class="rounded-full object-cover" />` at the requested size.
- Else → the current initial-letter gradient circle.
- Replace the three existing inline avatars with this component:
  `CandidateCard.tsx` (h-12 w-12), `CandidateRow.tsx`, and the profile header in
  `candidates/[id]/page.tsx` (h-16 w-16). Plain `<img>` (not `next/image`) to avoid
  optimizer config for an auth-gated dynamic route.

## 7. Validation, limits, errors

- Accepted types: `image/jpeg`, `image/png`, `image/webp`.
- Max upload size: 5 MB (pre-downscale guard); client downscale keeps the actual
  payload to ~100–300 KB, comfortably under Vercel's ~4.5 MB route body limit.
- Server re-validates type + size (never trust the client).
- A small pure helper `validatePhotoUpload({ type, size })` returns `{ ok } | { ok:false, message }`
  and is shared by the route and (where possible) the client.

## 8. Schema

No schema change — `Candidate.photoUrl String?` already exists. (No migration.)

## 9. Testing & verification

- **Unit (Vitest, pure):** `validatePhotoUpload` — accepts allowed types, rejects
  wrong type, rejects oversized. Matches the codebase's pure-function test pattern.
- **Manual (browser, logged in):**
  1. Add a candidate with a photo → appears on card + profile.
  2. Edit an existing candidate: replace the photo, and remove it (falls back to
     initials).
  3. Confirm the serving route is auth-gated: hitting `/api/candidates/<id>/photo`
     while logged out is blocked, and a candidate from another community 404s.
  4. Confirm canvas downscale produces a small JPEG (network tab payload size).
- Component upload/canvas behavior is verified manually (no component test runner),
  consistent with the M6 decision.

## Out of scope / non-goals

- Multiple photos / galleries (single photo only).
- Image cropping/editing UI.
- `next/image` optimization of the auth-gated route.
- Bot-driven photo ingestion (Phase 2) — though this storage layer is what the bot
  will reuse to store WhatsApp-received photos.

## Manual provisioning required before go-live

1. Create a Blob store in the Vercel project (Storage → Blob).
2. Add `BLOB_READ_WRITE_TOKEN` to Vercel (Production) and to local `.env`.
3. Redeploy.
