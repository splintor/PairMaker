# Candidate Feature Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship six beta-feedback candidate features: photo crop, age→birthdate, extra sector options, owner-only edits, requirements search, and a smoking field — with gender-matched display language throughout.

**Architecture:** Most data behavior flows through the declarative field registry (`src/lib/fields.ts`); we extend it with a `virtual` storage kind (age) and a real `boolean` type (smoking), then layer the feature-specific UI/permission/search changes on top. Pure logic lives in `src/lib/*` with colocated Vitest tests; React Server Components and Server Actions consume it.

**Tech Stack:** Next.js 15 App Router, React 19, Prisma 6 + Neon, Vitest, Tailwind 3, `react-easy-crop`.

---

## File structure

- `src/lib/fields.ts` — registry: `virtual` storage, `boolean` build, age/smoking field defs, sector options.
- `src/lib/candidate-display.ts` — `displayAge` (birthdate-only), `ageToBirthdate`, `ageWithBirthYear`, `smokingLabel`.
- `src/lib/candidate-search.ts` — requirements quick+advanced, longtext, age→birthdate range, boolean filter + chip.
- `src/lib/permissions.ts` — `canEditCandidate`.
- `src/app/app/candidates/actions.ts` — age→birthdate on save; ownership enforcement in `loadOwned`.
- `src/components/CandidateForm.tsx` — boolean checkbox input.
- `src/components/SearchPanel.tsx` — boolean tri-state select control.
- `src/components/CandidateCard.tsx`, `CandidateRow.tsx` — smoking chip.
- `src/app/app/candidates/[id]/page.tsx` — age/smoking display + owner-gated controls.
- `src/app/app/candidates/[id]/edit/page.tsx` — owner guard + seed `age` value.
- `src/components/PhotoPicker.tsx` + `src/components/PhotoCropModal.tsx` — crop UI.
- `prisma/schema.prisma` + migration — drop `ageManual`, random birthdate backfill.
- `prisma/seed.ts` — birthdate sample data.

---

## Task 1: Registry engine — `virtual` storage + `boolean` type

**Files:**
- Modify: `src/lib/fields.ts`
- Test: `src/lib/fields.test.ts`

- [ ] **Step 1: Write failing tests** in `src/lib/fields.test.ts`:

```ts
import { buildCandidateInput, getField } from "./fields";

describe("buildCandidateInput booleans", () => {
  it("stores checked boolean as true in details", () => {
    const { details } = buildCandidateInput({ name: "x", gender: "male", smoking: "true" });
    expect(details.smoking).toBe(true);
  });
  it("stores unchecked boolean as false (never skipped)", () => {
    const { details } = buildCandidateInput({ name: "x", gender: "male" });
    expect(details.smoking).toBe(false);
  });
});

describe("virtual storage", () => {
  it("never writes virtual fields to columns or details", () => {
    const { columns, details } = buildCandidateInput({ name: "x", gender: "male", age: "30" });
    expect("age" in columns).toBe(false);
    expect("age" in details).toBe(false);
  });
});

describe("sector options", () => {
  it("includes the new streams", () => {
    const opts = getField("sector")!.options!.map((o) => o.value);
    expect(opts).toEqual(expect.arrayContaining(["dati_leumi_torani", "dati_patuach", "datlash"]));
  });
});
```

- [ ] **Step 2: Run** `npm test -- fields` → expect FAIL.

- [ ] **Step 3: Implement** in `src/lib/fields.ts`:
  - Widen storage: `storage: "column" | "details" | "virtual";`
  - Widen `BuiltInput` value maps to allow `boolean`:
    `columns: Record<string, string | number | boolean>;` and
    `details: Record<string, string | number | boolean | string[]>;`
  - In `buildCandidateInput`, at the **top** of the `for` loop:

```ts
for (const field of FIELDS) {
  if (field.storage === "virtual") continue; // mapped to a real column by the caller (age→birthdate)
  const rawValue = raw[field.key];

  if (field.type === "boolean") {
    const v = rawValue === "true" || rawValue === "on" || rawValue === "1" || rawValue === true;
    if (field.storage === "column") columns[field.key] = v;
    else details[field.key] = v;
    continue;
  }

  const str = rawValue == null ? "" : String(rawValue).trim();
  // ...existing empty/number/select/storage logic unchanged...
}
```
  - Replace the `ageManual` field def with the virtual `age` field, in the `כללי` group:

```ts
{ key: "age", label: "גיל", type: "number", storage: "virtual", searchable: true, showInCard: false, group: "כללי" },
```
  - Append to the `sector` options array:

```ts
{ value: "dati_leumi_torani", label: "דתי לאומי תורני" },
{ value: "dati_patuach", label: "דתי פתוח" },
{ value: "datlash", label: "דתל\"ש" },
```
  - Add the smoking field (after `education`, group `רקע`):

```ts
{
  key: "smoking", label: "עישון", type: "boolean", storage: "details",
  options: [{ value: "true", label: "מעשן/ת" }, { value: "false", label: "לא מעשן/ת" }],
  searchable: true, showInCard: true, group: "רקע",
},
```
  - Flip `requirements` to `searchable: true`.

- [ ] **Step 4: Run** `npm test -- fields` → expect PASS.

- [ ] **Step 5: Commit** `git add src/lib/fields.ts src/lib/fields.test.ts && git commit -m "feat(fields): virtual storage, boolean type, sector options, smoking + searchable requirements"`

---

## Task 2: Display helpers — birthdate-only age, birth-year, smoking label

**Files:**
- Modify: `src/lib/candidate-display.ts`
- Test: `src/lib/candidate-display.test.ts`

- [ ] **Step 1: Update tests.** Replace the `displayAge` block and add new blocks:

```ts
import { displayAge, ageLabel, statusLabel, ageToBirthdate, ageWithBirthYear, smokingLabel } from "./candidate-display";

describe("displayAge", () => {
  const now = new Date("2026-06-09T00:00:00Z");
  it("derives age from birthdate", () =>
    expect(displayAge({ birthdate: new Date("1996-06-09T00:00:00Z") }, now)).toBe(30));
  it("returns null without birthdate", () =>
    expect(displayAge({ birthdate: null }, now)).toBeNull());
});

describe("ageToBirthdate", () => {
  const now = new Date("2026-06-09T00:00:00Z");
  it("round-trips with displayAge", () =>
    expect(displayAge({ birthdate: ageToBirthdate(30, now) }, now)).toBe(30));
  it("uses currentYear - age", () =>
    expect(ageToBirthdate(30, now).getUTCFullYear()).toBe(1996));
});

describe("ageWithBirthYear", () => {
  const now = new Date("2026-06-09T00:00:00Z");
  it("formats age with birth year", () =>
    expect(ageWithBirthYear({ birthdate: new Date("1996-06-09T00:00:00Z") }, now)).toBe("30 (שנת לידה: 1996)"));
  it("returns null without birthdate", () =>
    expect(ageWithBirthYear({ birthdate: null }, now)).toBeNull());
});

describe("smokingLabel", () => {
  it("male", () => expect(smokingLabel("male")).toBe("מעשן"));
  it("female", () => expect(smokingLabel("female")).toBe("מעשנת"));
});
```

- [ ] **Step 2: Run** `npm test -- candidate-display` → expect FAIL.

- [ ] **Step 3: Implement** in `src/lib/candidate-display.ts`:

```ts
export function displayAge(c: { birthdate: Date | null }, now: Date = new Date()): number | null {
  if (!c.birthdate) return null;
  let age = now.getUTCFullYear() - c.birthdate.getUTCFullYear();
  const m = now.getUTCMonth() - c.birthdate.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < c.birthdate.getUTCDate())) age--;
  return age;
}

/** Inverse of displayAge: a birthdate (today's month/day, year shifted back by `age`). */
export function ageToBirthdate(age: number, now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear() - age, now.getUTCMonth(), now.getUTCDate()));
}

/** "30 (שנת לידה: 1996)" — age with birth year, or null when no birthdate. */
export function ageWithBirthYear(c: { birthdate: Date | null }, now: Date = new Date()): string | null {
  const age = displayAge(c, now);
  if (age == null) return null;
  return `${age} (שנת לידה: ${c.birthdate!.getUTCFullYear()})`;
}

/** Gendered smoking word: מעשן (male) / מעשנת (female). */
export function smokingLabel(gender: "male" | "female" | null | undefined): string {
  return gender === "female" ? "מעשנת" : "מעשן";
}
```

- [ ] **Step 4: Run** `npm test -- candidate-display` → expect PASS.

- [ ] **Step 5: Commit** `git add src/lib/candidate-display.ts src/lib/candidate-display.test.ts && git commit -m "feat(display): birthdate-only age, ageToBirthdate, ageWithBirthYear, gendered smokingLabel"`

---

## Task 3: Search — requirements, longtext, age→birthdate range, boolean

**Files:**
- Modify: `src/lib/candidate-search.ts`
- Test: `src/lib/candidate-search.test.ts`

- [ ] **Step 1: Add failing tests** (append to existing suite):

```ts
it("quick search includes requirements", () => {
  const where = buildCandidateWhere({ q: "רצינית" }, "c1") as any;
  const or = where.AND.find((c: any) => c.OR)?.OR ?? [];
  expect(or.some((x: any) => "requirements" in x)).toBe(true);
});

it("age range maps to a birthdate range", () => {
  const where = buildCandidateWhere({ ageMin: "25", ageMax: "35" }, "c1") as any;
  const bd = where.AND.find((c: any) => c.birthdate)?.birthdate;
  expect(bd.lte.getUTCFullYear()).toBe(new Date().getUTCFullYear() - 25);
  expect(bd.gte.getUTCFullYear()).toBe(new Date().getUTCFullYear() - 35);
});

it("boolean filter maps to details equals", () => {
  const where = buildCandidateWhere({ smoking: "true" }, "c1") as any;
  const det = where.AND.find((c: any) => c.details);
  expect(det.details).toEqual({ path: ["smoking"], equals: true });
});
```

- [ ] **Step 2: Run** `npm test -- candidate-search` → expect FAIL.

- [ ] **Step 3: Implement** in `src/lib/candidate-search.ts`:
  - Add import: `import { ageToBirthdate } from "@/lib/candidate-display";`
  - In the quick-search `OR`, add: `{ requirements: { contains: q, mode: "insensitive" } },`
  - Replace the per-field loop branches:

```ts
if (f.type === "number") {
  if (f.key === "age") {
    const minA = Number(params.ageMin), maxA = Number(params.ageMax);
    const bd: { gte?: Date; lte?: Date } = {};
    if (params.ageMin && Number.isFinite(minA)) bd.lte = ageToBirthdate(minA); // youngest → latest birthdate
    if (params.ageMax && Number.isFinite(maxA)) bd.gte = ageToBirthdate(maxA); // oldest → earliest birthdate
    if (Object.keys(bd).length) and.push({ birthdate: bd });
    continue;
  }
  const range: { gte?: number; lte?: number } = {};
  const min = Number(params[`${f.key}Min`]);
  const max = Number(params[`${f.key}Max`]);
  if (params[`${f.key}Min`] && Number.isFinite(min)) range.gte = min;
  if (params[`${f.key}Max`] && Number.isFinite(max)) range.lte = max;
  if (Object.keys(range).length && f.storage === "column") {
    and.push({ [f.key]: range } as Prisma.CandidateWhereInput);
  }
} else if (f.type === "boolean") {
  const v = params[f.key]?.trim();
  if (v === "true" || v === "false") {
    const bool = v === "true";
    if (f.storage === "column") and.push({ [f.key]: bool } as Prisma.CandidateWhereInput);
    else and.push({ details: { path: [f.key], equals: bool } });
  }
} else if (f.type === "select") {
  // unchanged
} else if (f.type === "text" || f.type === "longtext") {
  // unchanged text-contains logic
}
```
  - Note: the loop currently starts `for (const f of SEARCHABLE_FIELDS) { if (f.key === "name") continue; ... }` — keep that guard. The `age`/`boolean`/`longtext` branches use `continue` only inside the number branch as shown.
  - In `describeActiveFilters`, add a boolean branch before the generic `else`:

```ts
} else if (f.type === "boolean") {
  const v = params[f.key]?.trim();
  if (v === "true" || v === "false")
    chips.push({ removeKeys: [f.key], label: `${f.label}: ${v === "true" ? "כן" : "לא"}` });
}
```

- [ ] **Step 4: Run** `npm test -- candidate-search` → expect PASS.

- [ ] **Step 5: Commit** `git add src/lib/candidate-search.ts src/lib/candidate-search.test.ts && git commit -m "feat(search): requirements + longtext + age-range + boolean filters"`

---

## Task 4: Permissions — `canEditCandidate`

**Files:**
- Modify: `src/lib/permissions.ts`
- Test: `src/lib/permissions.test.ts`

- [ ] **Step 1: Add failing test:**

```ts
import { can, canEditCandidate, type Action } from "./permissions";

describe("canEditCandidate", () => {
  it("admin can edit any candidate", () =>
    expect(canEditCandidate("admin", "u1", { createdById: "u2" })).toBe(true));
  it("member can edit own", () =>
    expect(canEditCandidate("member", "u1", { createdById: "u1" })).toBe(true));
  it("member cannot edit another's", () =>
    expect(canEditCandidate("member", "u1", { createdById: "u2" })).toBe(false));
  it("member cannot edit ownerless", () =>
    expect(canEditCandidate("member", "u1", { createdById: null })).toBe(false));
});
```

- [ ] **Step 2: Run** `npm test -- permissions` → expect FAIL.

- [ ] **Step 3: Implement** (append to `src/lib/permissions.ts`):

```ts
/** Members may mutate only candidates they created; admins may mutate any. */
export function canEditCandidate(
  role: Role,
  userId: string,
  candidate: { createdById: string | null },
): boolean {
  return role === "admin" || candidate.createdById === userId;
}
```

- [ ] **Step 4: Run** `npm test -- permissions` → expect PASS.

- [ ] **Step 5: Commit** `git add src/lib/permissions.ts src/lib/permissions.test.ts && git commit -m "feat(permissions): canEditCandidate ownership rule"`

---

## Task 5: Schema migration — drop `ageManual`, random birthdate backfill

**Files:**
- Modify: `prisma/schema.prisma`, `prisma/seed.ts`
- Create: migration under `prisma/migrations/`

- [ ] **Step 1:** In `prisma/schema.prisma`, delete the `ageManual Int?` line from `Candidate`.

- [ ] **Step 2: Generate migration without applying:**
  Run: `npx prisma migrate dev --name candidate_birthdate_only --create-only`

- [ ] **Step 3: Edit the generated migration SQL** — add the random-birthdate backfill BEFORE the drop:

```sql
-- Test data only: give existing rows a random birthdate (ages ~22–41) before removing ageManual.
UPDATE "Candidate"
SET "birthdate" = NOW() - ((floor(random() * 20) + 22) || ' years')::interval
WHERE "birthdate" IS NULL;

ALTER TABLE "Candidate" DROP COLUMN "ageManual";
```

- [ ] **Step 4: Apply:** `npm run db:migrate` (prisma migrate dev). Expected: migration applied, client regenerated.

- [ ] **Step 5: Update `prisma/seed.ts`** — replace `ageManual: N` in sample objects with a birthdate:

```ts
const yob = (age: number) => new Date(Date.UTC(new Date().getUTCFullYear() - age, 5, 9));
// ...
{ name: "יוסי כהן", gender: Gender.male, birthdate: yob(30), occupation: "מהנדס", heightCm: 178, requirements: "..." },
{ name: "דנה לוי", gender: Gender.female, birthdate: yob(27), occupation: "מורה", heightCm: 165, requirements: "..." },
```

- [ ] **Step 6: Commit** `git add prisma && git commit -m "feat(db): store birthdate instead of ageManual"`

---

## Task 6: Server actions — age→birthdate on save + ownership enforcement

**Files:**
- Modify: `src/app/app/candidates/actions.ts`

- [ ] **Step 1:** Add imports: `import { canEditCandidate } from "@/lib/permissions";`, `import { ageToBirthdate } from "@/lib/candidate-display";`, and `import type { ActiveContext } from "@/lib/community";`

- [ ] **Step 2:** Replace `loadOwned` with an ownership-enforcing version:

```ts
async function loadOwned(ctx: ActiveContext, id: string) {
  const c = await db.candidate.findFirst({ where: { id, communityId: ctx.communityId } });
  if (!c) redirect("/app/candidates");
  if (!canEditCandidate(ctx.role, ctx.userId, c)) redirect(`/app/candidates/${id}`);
  return c;
}
```
  Update its callers (`updateCandidate`, `deactivateCandidate`, `reactivateCandidate`, `deleteCandidate`) from `loadOwned(ctx.communityId, id)` to `loadOwned(ctx, id)`.

- [ ] **Step 3:** Add a birthdate helper used by both create and update:

```ts
function birthdateFromForm(formData: FormData): Date | null | "invalid" {
  const raw = String(formData.get("age") ?? "").trim();
  if (raw === "") return null;
  const age = Number(raw);
  if (!Number.isFinite(age) || age <= 0 || age > 120) return "invalid";
  return ageToBirthdate(age);
}
```

- [ ] **Step 4:** In `createCandidate`, after the errors check:

```ts
const birthdate = birthdateFromForm(formData);
if (birthdate === "invalid") redirect(`/app/candidates/new?error=validation`);
```
  Add `birthdate,` to the `tx.candidate.create({ data: { ... } })`.

- [ ] **Step 5:** In `updateCandidate`, after the errors check:

```ts
const birthdate = birthdateFromForm(formData);
if (birthdate === "invalid") { await setFlash({ type: "error", message: "גיל לא תקין" }); redirect(`/app/candidates/${id}/edit`); }
```
  Add `birthdate,` to the `tx.candidate.update({ data: { ... } })`. Also add `delete changes.birthdate;` next to the other `delete changes.*` lines (avoid a noisy raw-date diff).

- [ ] **Step 6: Run** `npm test` (regression) and `npx tsc --noEmit`. Expected: PASS / no type errors.

- [ ] **Step 7: Commit** `git add src/app/app/candidates/actions.ts && git commit -m "feat(candidates): derive birthdate from age input; enforce owner-only mutations"`

---

## Task 7: Form & search controls — boolean checkbox + tri-state select

**Files:**
- Modify: `src/components/CandidateForm.tsx`, `src/components/SearchPanel.tsx`

- [ ] **Step 1:** In `CandidateForm.tsx` `Input`, add a boolean branch before the `select` branch:

```tsx
if (field.type === "boolean") {
  return (
    <input
      type="checkbox"
      name={field.key}
      value="true"
      defaultChecked={value === "true" || value === "on"}
      className="h-5 w-5 rounded border-brand-300 text-brand-600"
    />
  );
}
```

- [ ] **Step 2:** In `SearchPanel.tsx` `FilterControl`, add a boolean branch (renders the tri-state Select using the field's options + "הכל" placeholder), before the select branch:

```tsx
if (field.type === "boolean") {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600">{field.label}</span>
      <Select name={field.key} options={field.options ?? []} defaultValue={params[field.key] ?? ""} placeholder="הכל" />
    </label>
  );
}
```

- [ ] **Step 3:** Update the quick-search input placeholder in `SearchPanel.tsx` to:
  `placeholder="חיפוש מהיר (שם, עיסוק, עיר, דרישות)…"`

- [ ] **Step 4: Run** `npx tsc --noEmit` → no errors.

- [ ] **Step 5: Commit** `git add src/components/CandidateForm.tsx src/components/SearchPanel.tsx && git commit -m "feat(ui): boolean checkbox in form, tri-state boolean filter in search"`

---

## Task 8: Cards & profile — age display, smoking chip, owner-gated controls

**Files:**
- Modify: `src/components/CandidateCard.tsx`, `src/components/CandidateRow.tsx`, `src/app/app/candidates/[id]/page.tsx`, `src/app/app/candidates/[id]/edit/page.tsx`

- [ ] **Step 1:** In `CandidateCard.tsx` and `CandidateRow.tsx`, import `smokingLabel`, read details, and append a smoking chip:

```tsx
import { displayAge, ageLabel, smokingLabel } from "@/lib/candidate-display";
// ...
const details = (c.details as Record<string, unknown>) ?? {};
const subtitleParts = [
  ageLabel(c.gender, age),
  c.occupation,
  c.heightCm ? `${c.heightCm} ס"מ` : null,            // (Row also keeps c.city)
  details.smoking === true ? smokingLabel(c.gender) : null,
].filter(Boolean);
```

- [ ] **Step 2:** In `[id]/page.tsx`:
  - Imports: add `ageWithBirthYear` (keep `displayAge`, `ageLabel`); add `canEditCandidate` from `@/lib/permissions`.
  - Replace the `columnFields`/`detailFields` split with a single ordered list (includes virtual age):

```tsx
const profileFields = FIELDS.filter((f) => !["name", "gender", "requirements"].includes(f.key));
```
  Render `{profileFields.map((f) => ...)}` in the grid.
  - Update `valueFor`:

```tsx
function valueFor(key: string): string {
  const field = getField(key)!;
  if (field.storage === "virtual") return key === "age" ? (ageWithBirthYear(c) ?? "—") : "—";
  const raw = field.storage === "column" ? (c as Record<string, unknown>)[key] : details[key];
  if (field.type === "boolean") return raw == null ? "—" : raw ? "כן" : "לא";
  if (raw == null || raw === "") return "—";
  if (field.options) return optionLabel(field, String(raw));
  return String(raw);
}
```
  - Compute `const canEdit = canEditCandidate(ctx.role, ctx.userId, c);` and wrap the **עריכה** `LinkButton`, the `DeactivateDialog`/reactivate `form`, and `DeleteCandidateButton` in `{canEdit && ( ... )}`. Leave the **+ הצעת שידוך** button ungated.

- [ ] **Step 3:** In `[id]/edit/page.tsx`:
  - Add `import { redirect } from "next/navigation";` and `import { canEditCandidate } from "@/lib/permissions";`
  - After loading `c`: `if (!canEditCandidate(ctx.role, ctx.userId, c)) redirect(\`/app/candidates/${id}\`);`
  - Seed the age value: `const values = { ...c, ...(c.details as Record<string, unknown>), age: displayAge(c) ?? "" }` (import `displayAge`).

- [ ] **Step 4: Run** `npx tsc --noEmit` and `npm test` → no errors.

- [ ] **Step 5: Commit** `git add src/components/CandidateCard.tsx src/components/CandidateRow.tsx "src/app/app/candidates/[id]/page.tsx" "src/app/app/candidates/[id]/edit/page.tsx" && git commit -m "feat(candidates): age+birthyear display, smoking chip, owner-gated controls"`

---

## Task 9: Photo crop (react-easy-crop)

**Files:**
- Create: `src/components/PhotoCropModal.tsx`
- Modify: `src/components/PhotoPicker.tsx`, `package.json`

- [ ] **Step 1: Install** `npm install react-easy-crop` then **`npm run fix-lock`** (mirror-only registry — required or Vercel deploy breaks).

- [ ] **Step 2: Create `src/components/PhotoCropModal.tsx`** — a client modal that crops to a square JPEG:

```tsx
"use client";
import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";

const OUT_EDGE = 512;

async function getCroppedBlob(src: string, area: { x: number; y: number; width: number; height: number }): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("decode"));
    i.src = src;
  });
  const edge = Math.min(OUT_EDGE, area.width);
  const canvas = document.createElement("canvas");
  canvas.width = edge;
  canvas.height = edge;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("decode");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, edge, edge);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("decode");
  return blob;
}

export function PhotoCropModal({
  src,
  onCancel,
  onCropped,
}: {
  src: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const onComplete = useCallback((_: unknown, px: { x: number; y: number; width: number; height: number }) => setArea(px), []);

  async function confirm() {
    if (!area) return;
    setBusy(true);
    try {
      onCropped(await getCroppedBlob(src, area));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 p-4" dir="rtl">
      <div className="relative h-72 w-72 overflow-hidden rounded-xl2 bg-black">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onComplete}
        />
      </div>
      <input
        type="range" min={1} max={3} step={0.01} value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        className="mt-4 w-72"
        aria-label="זום"
      />
      <div className="mt-3 flex gap-3">
        <button type="button" onClick={confirm} disabled={busy}
          className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
          {busy ? "שומר…" : "שמירה"}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-white/40 px-5 py-2 text-sm text-white hover:bg-white/10">
          ביטול
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rework `PhotoPicker.tsx`** — drop `downscale()`; on file select, open the crop modal instead of uploading immediately. Keep the existing upload (`/api/candidates/photo`) but feed it the cropped blob:

```tsx
// state additions
const [cropSrc, setCropSrc] = useState<string | null>(null);

async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  setError(null);
  const check = validatePhotoUpload({ type: file.type, size: file.size });
  if (!check.ok) { setError(check.message); return; }
  setCropSrc(URL.createObjectURL(file)); // open modal; upload happens after crop
}

async function uploadBlob(blob: Blob) {
  setBusy(true);
  try {
    const fd = new FormData();
    fd.append("file", blob, "photo.jpg");
    const res = await fetch("/api/candidates/photo", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "upload");
    setHandle(json.handle);
    setPreview(URL.createObjectURL(blob));
  } catch {
    setError("העלאת התמונה נכשלה");
  } finally {
    setBusy(false);
  }
}

function closeCrop() {
  if (cropSrc) URL.revokeObjectURL(cropSrc);
  setCropSrc(null);
  if (inputRef.current) inputRef.current.value = "";
}
```
  Render the modal at the end of the component's JSX:

```tsx
{cropSrc && (
  <PhotoCropModal
    src={cropSrc}
    onCancel={closeCrop}
    onCropped={async (blob) => { await uploadBlob(blob); closeCrop(); }}
  />
)}
```
  Add `import { PhotoCropModal } from "@/components/PhotoCropModal";`

- [ ] **Step 4: Verify** `npx tsc --noEmit` and `npm run build` succeed.

- [ ] **Step 5: Commit** `git add package.json package-lock.json src/components/PhotoPicker.tsx src/components/PhotoCropModal.tsx && git commit -m "feat(photo): square crop with react-easy-crop before upload"`

---

## Task 10: Final verification

- [ ] **Step 1:** `npm test` → all pass.
- [ ] **Step 2:** `npx tsc --noEmit` → no errors.
- [ ] **Step 3:** `npm run build` → succeeds.
- [ ] **Step 4:** Update `CLAUDE.md` schema/display notes (ageManual removed; boolean now implemented; ownership rule added).
- [ ] **Step 5:** Manual smoke (`npm run dev`): create candidate with age+smoking+photo crop; verify card shows age + smoking chip; profile shows "30 (שנת לידה: 1996)"; search by age range / smoking / requirements; confirm a non-owner member cannot see edit controls.

---

## Self-review notes

- **Spec coverage:** #1 Task 9; #2 Tasks 1,2,5,6,8; #3 Task 1; #4 Tasks 4,6,8; #5 Tasks 1,3,7; #6 Tasks 1,3,7,8. Gender-language convention: Task 2 (`smokingLabel`) + Task 8 (card chip). All covered.
- **Type consistency:** `ageToBirthdate`/`displayAge`/`ageWithBirthYear` signatures consistent across Tasks 2/3/6/8; `canEditCandidate(role,userId,{createdById})` consistent across Tasks 4/6/8; `BuiltInput` widened to `boolean` in Task 1 and consumed in Task 6.
- **Placeholders:** none — every code step shows concrete code.
