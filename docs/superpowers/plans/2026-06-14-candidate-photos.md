# Candidate Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let matchmakers attach one private photo to a candidate from the add/edit form, viewable only by logged-in members of that candidate's community; fall back to the initial-letter avatar when absent.

**Architecture:** Client `PhotoPicker` downscales the image (canvas) and uploads it to a server route that writes to Vercel Blob; the candidate's existing `photoUrl` column stores the blob handle. A second, auth-gated route streams the photo. A shared `CandidateAvatar` renders the photo (via the gated route) or the initial-letter fallback.

**Tech Stack:** Next.js 15 App Router (route handlers), React 19, Prisma/Neon, `@vercel/blob`, Vitest (pure-logic unit tests only).

**Spec:** `docs/superpowers/specs/2026-06-14-candidate-photos-design.md`

**Conventions:** `requireMembership()` (in `src/lib/community.ts`) redirects on no session — correct for pages, NOT for API routes. Routes use `auth()` from `@/lib/auth` + an explicit `db.membership` check and return JSON/HTTP errors. All cross-community access is gated by `communityId`.

**Global verification (after every task):** `npx tsc --noEmit`, `npm test`, `npm run build` — all green.

---

## File Structure

**New**
- `src/lib/photo.ts` — pure `validatePhotoUpload({ type, size })`; shared constants (allowed types, max size). *Pure, testable.*
- `src/lib/photo.test.ts` — unit tests.
- `src/lib/blob.ts` — thin wrapper around `@vercel/blob` (`storeCandidatePhoto`, `readCandidatePhoto`, `deleteCandidatePhoto`) isolating the SDK + token. *Single place the SDK is touched.*
- `src/app/api/candidates/photo/route.ts` — `POST` upload handler.
- `src/app/api/candidates/[id]/photo/route.ts` — `GET` auth-gated serving handler.
- `src/components/PhotoPicker.tsx` — client picker (downscale + upload + preview).
- `src/components/CandidateAvatar.tsx` — photo-or-initials avatar.

**Modified**
- `src/components/CandidateForm.tsx` — render `<PhotoPicker>`; add `photoUrl` to `Values`.
- `src/app/app/candidates/actions.ts` — persist `photoUrl` on create/update; best-effort old-blob cleanup on update/delete; exclude `photoUrl` from the audit diff.
- `src/components/CandidateCard.tsx`, `src/components/CandidateRow.tsx`, `src/app/app/candidates/[id]/page.tsx` — use `CandidateAvatar`.
- `.env` (local) — add `BLOB_READ_WRITE_TOKEN` (value provisioned by the user).

---

## Task 1: Add `@vercel/blob` + verify private API + blob wrapper

**Files:** `package.json`, `package-lock.json`, Create `src/lib/blob.ts`

- [ ] **Step 1: Install the SDK (public registry)**

Run: `npm install @vercel/blob`
Then verify the lockfile didn't pick up the private mirror:
Run: `grep -E "resolved\":" package-lock.json | grep -ivE "registry.npmjs.org" | wc -l`
Expected: `0`. (The committed `.npmrc` pins the public registry; if non-zero, rewrite the offending `resolved` URLs to `https://registry.npmjs.org/...` as in commit 93dc160.)

- [ ] **Step 2: Verify the private-Blob API against the installed package**

Run: `ls node_modules/@vercel/blob/dist && grep -rEi "access|private|downloadUrl|export declare function (put|head|del)" node_modules/@vercel/blob/dist/index.d.ts | head -40`
Confirm: (a) `put(pathname, body, options)` accepts `access` including a private/non-public value, and (b) how a private blob is read back server-side (e.g. `head()` returning a `downloadUrl`, or a dedicated download export).
- If `access: 'private'` IS supported → use it (Step 3 as written).
- If the installed version only supports `access: 'public'` → **STOP and ask the user**: proceed with public-unguessable storage behind the same auth-gated serving route (URL kept server-side, never sent to the browser), or upgrade the package. Do not silently downgrade — the user explicitly chose access-controlled.

Record the confirmed calls; use them verbatim in Step 3 and Task 4.

- [ ] **Step 3: Write the blob wrapper**

Create `src/lib/blob.ts` (adjust the three SDK calls to the API confirmed in Step 2):

```ts
import { put, head, del } from "@vercel/blob";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

/** Store a candidate photo privately; returns the blob handle to persist in photoUrl. */
export async function storeCandidatePhoto(
  body: ArrayBuffer | Buffer,
  ext: string,
  contentType: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const { url } = await put(`candidates/${id}.${ext}`, body, {
    access: "private",
    token: TOKEN,
    contentType,
  });
  return url;
}

/** Fetch a private candidate photo's bytes + content type for streaming. */
export async function readCandidatePhoto(
  handle: string,
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const meta = await head(handle, { token: TOKEN });
  if (!meta) return null;
  const res = await fetch(meta.downloadUrl);
  if (!res.ok) return null;
  return { body: await res.arrayBuffer(), contentType: meta.contentType };
}

/** Best-effort delete; never throws. */
export async function deleteCandidatePhoto(handle: string): Promise<void> {
  try {
    await del(handle, { token: TOKEN });
  } catch {
    /* orphaned blob is acceptable; don't block the mutation */
  }
}
```

- [ ] **Step 4: Add the local env var**

Add to `.env` (value from the user's Vercel Blob store; placeholder is fine for build, real value needed to run):
```
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

- [ ] **Step 5: Verify build + commit**

Run: `npx tsc --noEmit && npm run build` → green.
```bash
git add package.json package-lock.json src/lib/blob.ts
git commit -m "feat(photos): add @vercel/blob + private blob wrapper"
```

---

## Task 2: `validatePhotoUpload` pure helper (TDD)

**Files:** Create `src/lib/photo.ts`, `src/lib/photo.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/photo.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validatePhotoUpload, MAX_PHOTO_BYTES, ACCEPTED_PHOTO_TYPES } from "./photo";

describe("validatePhotoUpload", () => {
  it("accepts a small jpeg", () => {
    expect(validatePhotoUpload({ type: "image/jpeg", size: 200_000 })).toEqual({ ok: true });
  });

  it("accepts png and webp", () => {
    expect(validatePhotoUpload({ type: "image/png", size: 1000 }).ok).toBe(true);
    expect(validatePhotoUpload({ type: "image/webp", size: 1000 }).ok).toBe(true);
  });

  it("rejects an unsupported type", () => {
    const r = validatePhotoUpload({ type: "image/gif", size: 1000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("סוג");
  });

  it("rejects an oversized file", () => {
    const r = validatePhotoUpload({ type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("גדול");
  });

  it("exposes accepted types", () => {
    expect(ACCEPTED_PHOTO_TYPES).toContain("image/jpeg");
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npm test -- src/lib/photo.test.ts`
Expected: FAIL — cannot resolve `./photo`.

- [ ] **Step 3: Implement**

Create `src/lib/photo.ts`:

```ts
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

export type PhotoValidation = { ok: true } | { ok: false; message: string };

export function validatePhotoUpload({ type, size }: { type: string; size: number }): PhotoValidation {
  if (!ACCEPTED_PHOTO_TYPES.includes(type as (typeof ACCEPTED_PHOTO_TYPES)[number])) {
    return { ok: false, message: "סוג קובץ לא נתמך (יש להעלות JPG/PNG/WEBP)" };
  }
  if (size > MAX_PHOTO_BYTES) {
    return { ok: false, message: "הקובץ גדול מדי (עד 5MB)" };
  }
  return { ok: true };
}

export function extForType(type: string): string {
  return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- src/lib/photo.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/photo.ts src/lib/photo.test.ts
git commit -m "feat(photos): validatePhotoUpload helper (TDD)"
```

---

## Task 3: Upload route — `POST /api/candidates/photo`

**Files:** Create `src/app/api/candidates/photo/route.ts`

- [ ] **Step 1: Implement the route**

```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { storeCandidatePhoto } from "@/lib/blob";
import { validatePhotoUpload, extForType } from "@/lib/photo";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Must be a member of at least one community.
  const member = await db.membership.findFirst({ where: { userId: session.user.id } });
  if (!member) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "חסר קובץ" }, { status: 400 });
  }

  const check = validatePhotoUpload({ type: file.type, size: file.size });
  if (!check.ok) return NextResponse.json({ error: check.message }, { status: 400 });

  const handle = await storeCandidatePhoto(
    await file.arrayBuffer(),
    extForType(file.type),
    file.type,
  );
  return NextResponse.json({ handle });
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit && npm run build` → green (route compiles as a dynamic function).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/candidates/photo/route.ts
git commit -m "feat(photos): authenticated photo upload route"
```

---

## Task 4: Serving route — `GET /api/candidates/[id]/photo`

**Files:** Create `src/app/api/candidates/[id]/photo/route.ts`

- [ ] **Step 1: Implement the route**

```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readCandidatePhoto } from "@/lib/blob";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse(null, { status: 401 });

  const { id } = await params;
  const candidate = await db.candidate.findUnique({ where: { id } });
  if (!candidate || !candidate.photoUrl) return new NextResponse(null, { status: 404 });

  // Viewer must be a member of the candidate's community.
  const member = await db.membership.findFirst({
    where: { userId: session.user.id, communityId: candidate.communityId },
  });
  if (!member) return new NextResponse(null, { status: 404 });

  const photo = await readCandidatePhoto(candidate.photoUrl);
  if (!photo) return new NextResponse(null, { status: 404 });

  return new NextResponse(photo.body, {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit && npm run build` → green.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/candidates/[id]/photo/route.ts"
git commit -m "feat(photos): auth-gated photo serving route"
```

---

## Task 5: `CandidateAvatar` display component

**Files:** Create `src/components/CandidateAvatar.tsx`; Modify `CandidateCard.tsx`, `CandidateRow.tsx`, `candidates/[id]/page.tsx`

- [ ] **Step 1: Create the component**

```tsx
const SIZES = {
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-lg",
  lg: "h-16 w-16 text-2xl",
} as const;

export function CandidateAvatar({
  id,
  name,
  photoUrl,
  size = "md",
}: {
  id: string;
  name: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZES;
}) {
  const cls = `${SIZES[size]} shrink-0 rounded-full`;
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={`/api/candidates/${id}/photo`}
        alt={name}
        className={`${cls} object-cover`}
      />
    );
  }
  return (
    <div className={`${cls} flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 font-bold text-white`}>
      {name.charAt(0)}
    </div>
  );
}
```

- [ ] **Step 2: Use it in `CandidateCard.tsx`**

Replace the avatar `<div className="flex h-12 w-12 ...">{c.name.charAt(0)}</div>` with:
```tsx
<CandidateAvatar id={c.id} name={c.name} photoUrl={c.photoUrl} size="md" />
```
Add `import { CandidateAvatar } from "@/components/CandidateAvatar";`.

- [ ] **Step 3: Use it in `CandidateRow.tsx`**

Replace the `<div className="flex h-9 w-9 ...">{c.name.charAt(0)}</div>` with:
```tsx
<CandidateAvatar id={c.id} name={c.name} photoUrl={c.photoUrl} size="sm" />
```
Add the import.

- [ ] **Step 4: Use it in the profile header (`candidates/[id]/page.tsx`)**

Replace the `<div className="flex h-16 w-16 ...">{c.name.charAt(0)}</div>` with:
```tsx
<CandidateAvatar id={c.id} name={c.name} photoUrl={c.photoUrl} size="lg" />
```
Add the import.

- [ ] **Step 5: Verify build + commit**

Run: `npx tsc --noEmit && npm run build` → green.
```bash
git add src/components/CandidateAvatar.tsx src/components/CandidateCard.tsx src/components/CandidateRow.tsx "src/app/app/candidates/[id]/page.tsx"
git commit -m "feat(photos): CandidateAvatar (photo or initials) across card/row/profile"
```

---

## Task 6: `PhotoPicker` client component

**Files:** Create `src/components/PhotoPicker.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import { useRef, useState } from "react";
import { validatePhotoUpload } from "@/lib/photo";

const MAX_EDGE = 1280;

/** Downscale to <=1280px longest edge, return a JPEG blob. Throws if undecodable. */
async function downscale(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode"));
      i.src = url;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (!blob) throw new Error("encode");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoPicker({
  name,
  defaultPhotoUrl,
  candidateId,
}: {
  name: string;
  defaultPhotoUrl?: string | null;
  candidateId?: string;
}) {
  const initialSrc = defaultPhotoUrl && candidateId ? `/api/candidates/${candidateId}/photo` : null;
  const [preview, setPreview] = useState<string | null>(initialSrc);
  const [handle, setHandle] = useState<string>(defaultPhotoUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const check = validatePhotoUpload({ type: file.type, size: file.size });
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setBusy(true);
    try {
      const blob = await downscale(file);
      const fd = new FormData();
      fd.append("file", blob, "photo.jpg");
      const res = await fetch("/api/candidates/photo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "upload failed");
      setHandle(json.handle);
      setPreview(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error && err.message === "decode" ? "לא ניתן לקרוא את התמונה" : "העלאת התמונה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    setHandle("");
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name={name} value={handle} />
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-2xl text-brand-400">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="תצוגה מקדימה" className="h-full w-full object-cover" />
        ) : (
          "📷"
        )}
      </div>
      <div className="space-y-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
          >
            {busy ? "מעלה…" : "בחר תמונה"}
          </button>
          {handle && (
            <button type="button" onClick={remove} className="text-sm text-red-600 hover:underline">
              הסר תמונה
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="hidden" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + commit**

Run: `npx tsc --noEmit && npm run build` → green.
```bash
git add src/components/PhotoPicker.tsx
git commit -m "feat(photos): PhotoPicker client component (downscale + upload)"
```

---

## Task 7: Form integration + persist in actions

**Files:** Modify `src/components/CandidateForm.tsx`, `src/app/app/candidates/actions.ts`

- [ ] **Step 1: Render the picker in `CandidateForm`**

Add imports:
```tsx
import { PhotoPicker } from "@/components/PhotoPicker";
```
Add `photoUrl` to the `Values` type (it is `Record<string, string | number | null | undefined>` — already permits it; no type change needed). Render the picker as the first child inside the `<form>` (before the `groups.map`):
```tsx
      <PhotoPicker
        name="photoUrl"
        defaultPhotoUrl={typeof values.photoUrl === "string" ? values.photoUrl : null}
        candidateId={typeof values.id === "string" ? values.id : undefined}
      />
```

- [ ] **Step 2: Persist `photoUrl` in `createCandidate`**

In `src/app/app/candidates/actions.ts`, inside `createCandidate`, after building `columns`/`details` and before the transaction, read the handle and include it in the create data:
```ts
  const photoUrl = (String(formData.get("photoUrl") ?? "").trim() || null);
```
Then add `photoUrl,` to the `tx.candidate.create({ data: { … } })` object (alongside `details` and the spread `columns`).

- [ ] **Step 3: Persist + clean up in `updateCandidate`**

In `updateCandidate`, read the new handle and capture the old one for cleanup:
```ts
  const photoUrl = (String(formData.get("photoUrl") ?? "").trim() || null);
  const oldPhotoUrl = existing.photoUrl;
```
Add `photoUrl,` to the `tx.candidate.update({ data: { … } })` object. Exclude it from the audit diff next to the existing deletes:
```ts
    delete changes.updatedAt;
    delete changes.details;
    delete changes.photoUrl; // blob handle — don't print in the activity log
```
After the transaction (after the `revalidatePath` calls, before `redirect`), best-effort delete the replaced blob:
```ts
  if (oldPhotoUrl && oldPhotoUrl !== photoUrl) {
    const { deleteCandidatePhoto } = await import("@/lib/blob");
    await deleteCandidatePhoto(oldPhotoUrl);
  }
```

- [ ] **Step 4: Clean up on delete**

In `deleteCandidate`, after the transaction and before `redirect`, delete the blob if present:
```ts
  if (existing.photoUrl) {
    const { deleteCandidatePhoto } = await import("@/lib/blob");
    await deleteCandidatePhoto(existing.photoUrl);
  }
```
(`existing` already loaded via `loadOwned`.)

- [ ] **Step 5: Verify build + tests + commit**

Run: `npx tsc --noEmit && npm test && npm run build` → all green.
```bash
git add src/components/CandidateForm.tsx src/app/app/candidates/actions.ts
git commit -m "feat(photos): wire PhotoPicker into form; persist photoUrl + blob cleanup"
```

---

## Task 8: Verification

- [ ] **Step 1: Full regression**

Run: `npx tsc --noEmit && npm test && npm run build` → all green.

- [ ] **Step 2: Manual (requires a real `BLOB_READ_WRITE_TOKEN` in `.env`)**

With `npm run dev`, logged in:
1. Add a candidate, pick a photo → uploads, preview shows, candidate saved; photo appears on the card and profile.
2. Edit that candidate → replace the photo (old blob cleaned up), and remove it (falls back to initials).
3. Confirm gating: open `/api/candidates/<id>/photo` in a logged-out tab → 401; a candidate id from another community → 404.
4. Network tab: uploaded payload is a small JPEG (~100–300 KB).

- [ ] **Step 3: If the token isn't provisioned yet**

`tsc`/`test`/`build` still pass without the token (it's read at request time). Note in the completion report that end-to-end photo upload requires the user to create a Vercel Blob store and set `BLOB_READ_WRITE_TOKEN` locally and in Vercel, then redeploy.

---

## Self-Review

**Spec coverage:**
- §1 storage/config → Task 1 (dep, token, wrapper, private-API verify). ✔
- §2 upload route → Task 3. ✔
- §3 serving route → Task 4. ✔
- §4 PhotoPicker (downscale/upload/preview/remove/error) → Task 6. ✔
- §5 form + actions (persist, cleanup on replace+delete, audit exclude) → Task 7. ✔
- §6 CandidateAvatar across card/row/profile → Task 5. ✔
- §7 validation/limits → Task 2 (pure helper, reused in route + client). ✔
- §8 no schema change → confirmed (no migration task). ✔
- §9 testing → Task 2 unit + Task 8 manual. ✔

**Placeholder scan:** No TBD/TODO. The one external-API uncertainty (private Blob read) is an explicit, executable verification step (Task 1 Step 2) with a defined stop-and-ask fallback — not a code placeholder.

**Type consistency:** `storeCandidatePhoto`/`readCandidatePhoto`/`deleteCandidatePhoto` signatures match their call sites (route, serving route, actions). `validatePhotoUpload` return shape (`{ok:true} | {ok:false,message}`) used consistently in route + picker. `CandidateAvatar` props (`id`,`name`,`photoUrl`,`size`) match all three call sites. `photoUrl` persisted as `string | null` everywhere.

**Risk note:** Task 1 Step 2 gates the whole feature on confirming `@vercel/blob` private support; if absent, implementation stops and asks rather than downgrading the user's access-control choice.
