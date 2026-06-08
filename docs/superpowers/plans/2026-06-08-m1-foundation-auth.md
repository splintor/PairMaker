# M1 — Foundation & Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js + Postgres foundation for the shidduch matchmaker web app: RTL Hebrew lavender UI shell, the full Prisma schema for Phase 1, Auth.js sign-in (magic-link + Google), multi-tenant active-community context, and a tested role/permission helper — enough that a matchmaker can sign in, land in their community, and see an (empty) authenticated shell.

**Architecture:** Next.js 15 App Router (TypeScript) on Vercel. Postgres (Neon/Vercel) via Prisma. Auth.js v5 with the Prisma adapter (DB sessions), Google OAuth + Resend magic-link. Every domain row is scoped to a `communityId`; authorization is a pure function (`can(role, action)`) tested in isolation, plus server-side guards (`requireMembership`) that resolve the signed-in user's role in the active community. Tailwind v3 provides the lavender-periwinkle theme; the root layout is `dir="rtl" lang="he"`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 3.4, Prisma 6, Auth.js v5 (`next-auth@beta`, `@auth/prisma-adapter`), Resend (email), Vitest (unit tests), Zod.

Reference spec: `docs/superpowers/specs/2026-06-08-shidduch-matchmaker-design.md`

---

## File Structure (created in this milestone)

```
package.json, tsconfig.json, next.config.ts, .env.example, .gitignore
postcss.config.mjs, tailwind.config.ts
vitest.config.ts
prisma/schema.prisma
prisma/seed.ts
src/app/layout.tsx                      # root: dir=rtl lang=he, theme
src/app/globals.css                     # Tailwind + lavender tokens
src/app/page.tsx                        # redirects to /app or /signin
src/app/(auth)/signin/page.tsx          # sign-in UI
src/app/(app)/layout.tsx                # authed shell: top nav + community switcher
src/app/(app)/page.tsx                  # placeholder dashboard
src/app/api/auth/[...nextauth]/route.ts # Auth.js handlers
src/lib/db.ts                           # Prisma client singleton
src/lib/auth.ts                         # Auth.js config (providers, adapter, callbacks)
src/lib/permissions.ts                  # pure can(role, action) + action types
src/lib/permissions.test.ts             # Vitest unit tests
src/lib/community.ts                    # active-community resolution + requireMembership
src/lib/community.test.ts               # Vitest unit tests for the pure parts
src/components/CommunitySwitcher.tsx     # tenant switcher (client)
src/components/TopNav.tsx                # top navigation bar
```

> Route protection for `/app/*` is enforced **server-side** in `src/app/(app)/layout.tsx`
> (`requireMembership()` redirects unauthenticated users to `/signin`). We deliberately do **not**
> use Next.js middleware for auth here: with database sessions + the Prisma adapter, importing the
> Prisma-bound `auth` into middleware would run Prisma on the Edge runtime, which is unsupported.

---

## Task 0: Scaffold the Next.js app

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `postcss.config.mjs`, `tailwind.config.ts`

- [ ] **Step 1: Initialize git and the Next.js project**

Run from `/Users/shmulikf/match-maker` (the folder already contains `docs/`):
```bash
git init
npx create-next-app@15 . --ts --app --tailwind --src-dir --import-alias "@/*" --no-eslint --use-npm --yes
```
If `create-next-app` refuses because the directory is non-empty, scaffold in a temp dir and copy in:
```bash
npx create-next-app@15 /tmp/mm-scaffold --ts --app --tailwind --src-dir --import-alias "@/*" --no-eslint --use-npm --yes
cp -r /tmp/mm-scaffold/. . && rm -rf /tmp/mm-scaffold
```
Expected: a runnable Next.js app with `src/app/`, Tailwind configured, `package.json` present.

- [ ] **Step 2: Verify the dev server boots**

Run: `npm run dev` then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` (stop the server after).
Expected: `200`.

- [ ] **Step 3: Ensure `.gitignore` covers local + brainstorm artifacts**

Append to `.gitignore` if missing:
```
.env
.env*.local
.superpowers/
/.vercel
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app (App Router, TS, Tailwind, src dir)"
```

---

## Task 1: RTL Hebrew root layout + lavender theme

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Add lavender-periwinkle theme tokens to Tailwind**

Replace `tailwind.config.ts` with:
```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // lavender-periwinkle, blue-led, soft
        brand: {
          50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe",
          400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 900: "#3730a3",
        },
        peach: { 100: "#fff7ed", 200: "#fcd9b6", 700: "#b45309" },
      },
      borderRadius: { xl2: "1rem" },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 2: Set RTL + Hebrew + base background in the root layout**

Replace `src/app/layout.tsx` with:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "שידוכים",
  description: "מערכת ניהול מועמדים לשידוך",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-[#f8f9ff] text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Ensure globals.css keeps Tailwind directives**

`src/app/globals.css` must contain (at top):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
Remove any default starter gradient/dark-mode boilerplate below it.

- [ ] **Step 4: Verify RTL renders**

Replace `src/app/page.tsx` temporarily with:
```tsx
export default function Home() {
  return <main className="p-8"><h1 className="text-2xl font-bold text-brand-700">שלום</h1></main>;
}
```
Run `npm run dev`, open `http://localhost:3000`, confirm the heading is right-aligned (RTL) and uses the brand color. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: RTL Hebrew root layout and lavender theme tokens"
```

---

## Task 2: Prisma schema (full Phase-1 model) + client

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Create: `.env.example`
- Modify: `package.json` (scripts)

> We define the **entire Phase-1 schema now** (candidates, suggestions, audit log, etc.) so later milestones add UI/logic without schema churn.

- [ ] **Step 1: Install Prisma**

```bash
npm i -D prisma && npm i @prisma/client
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write the schema**

Replace `prisma/schema.prisma` with:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role { admin member }
enum Gender { male female }
enum CandidateStatus { active inactive }
enum SuggestionStatus { proposed accepted meeting closed }
enum AuditSource { user bot }

model User {
  id            String       @id @default(cuid())
  name          String?
  email         String?      @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  memberships   Membership[]
  createdAt     DateTime     @default(now())
}

model Community {
  id          String       @id @default(cuid())
  name        String
  // WhatsApp config is added in Phase 2.
  memberships Membership[]
  candidates  Candidate[]
  suggestions Suggestion[]
  auditLogs   AuditLog[]
  createdAt   DateTime     @default(now())
}

model Membership {
  id          String    @id @default(cuid())
  userId      String
  communityId String
  role        Role      @default(member)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  community   Community @relation(fields: [communityId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())

  @@unique([userId, communityId])
  @@index([communityId])
}

model Candidate {
  id                 String          @id @default(cuid())
  communityId        String
  name               String
  gender             Gender
  birthdate          DateTime?
  ageManual          Int?
  occupation         String?
  heightCm           Int?
  city               String?
  requirements       String?         @db.Text
  photoUrl           String?
  details            Json            @default("{}")
  status             CandidateStatus @default(active)
  deactivationReason String?
  deactivationNote   String?         @db.Text
  deactivatedAt      DateTime?
  createdById        String?
  // Phase-2 provenance:
  sourceMessageId    String?
  rawText            String?         @db.Text
  parsedJson         Json?
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  community          Community       @relation(fields: [communityId], references: [id], onDelete: Cascade)
  createdBy          User?           @relation("CandidateCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  suggestionsAsA     Suggestion[]    @relation("SuggestionA")
  suggestionsAsB     Suggestion[]    @relation("SuggestionB")

  @@index([communityId, status])
  @@index([communityId, gender])
}

model Suggestion {
  id           String           @id @default(cuid())
  communityId  String
  candidateAId String
  candidateBId String
  // pairKey = sorted("A:B") to enforce one suggestion per unordered pair
  pairKey      String
  status       SuggestionStatus @default(proposed)
  outcome      String?
  notes        String?          @db.Text
  createdById  String?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  community    Community        @relation(fields: [communityId], references: [id], onDelete: Cascade)
  candidateA   Candidate        @relation("SuggestionA", fields: [candidateAId], references: [id], onDelete: Cascade)
  candidateB   Candidate        @relation("SuggestionB", fields: [candidateBId], references: [id], onDelete: Cascade)
  createdBy    User?            @relation("SuggestionCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  @@unique([communityId, pairKey])
  @@index([communityId, status])
}

model AuditLog {
  id          String      @id @default(cuid())
  communityId String
  entityType  String      // 'candidate' | 'suggestion' | 'membership' | 'community'
  entityId    String
  entityLabel String      // human-readable snapshot name
  action      String      // 'create' | 'update' | 'deactivate' | 'reactivate' | 'delete'
  source      AuditSource @default(user)
  actorId     String?
  changes     Json?       // { field: { from, to } }
  snapshot    Json?       // full record on delete
  note        String?     @db.Text
  createdAt   DateTime    @default(now())

  community   Community   @relation(fields: [communityId], references: [id], onDelete: Cascade)

  @@index([communityId, createdAt])
  @@index([communityId, entityType])
}

// ---- Auth.js (NextAuth) adapter models ----
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

Add the missing back-relations on `User` (Prisma requires both sides). Add these lines inside `model User { ... }`:
```prisma
  candidatesCreated  Candidate[]  @relation("CandidateCreatedBy")
  suggestionsCreated Suggestion[] @relation("SuggestionCreatedBy")
```

- [ ] **Step 2b: Add convenience scripts to `package.json`**

In `"scripts"` add:
```json
"db:generate": "prisma generate",
"db:migrate": "prisma migrate dev",
"db:seed": "tsx prisma/seed.ts",
"test": "vitest run",
"test:watch": "vitest"
```
And add a `prisma` block at the top level of `package.json`:
```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

- [ ] **Step 3: Provide a Postgres URL and document env**

Create `.env.example`:
```
# Postgres (Neon free tier or local). pooled URL is fine for the app.
DATABASE_URL="postgresql://USER:PASS@HOST/DB?sslmode=require"
# Auth.js
AUTH_SECRET="generate with: npx auth secret"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
AUTH_RESEND_KEY=""
EMAIL_FROM="שידוכים <onboarding@resend.dev>"
NEXTAUTH_URL="http://localhost:3000"
```
Copy to `.env` and fill `DATABASE_URL` with a real Neon dev database (free) before migrating.

- [ ] **Step 4: Create the Prisma client singleton**

Create `src/lib/db.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 5: Generate client and run the first migration**

```bash
npm i -D tsx
npx prisma migrate dev --name init
```
Expected: migration created and applied; `@prisma/client` generated; no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: full Phase-1 Prisma schema, client singleton, db scripts"
```

---

## Task 3: Vitest setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (already has test scripts from Task 2)

- [ ] **Step 1: Install Vitest**

```bash
npm i -D vitest
```

- [ ] **Step 2: Configure Vitest for node + path alias**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
```

- [ ] **Step 3: Verify the runner works with a throwaway test**

Create `src/lib/_smoke.test.ts`:
```ts
import { expect, test } from "vitest";
test("vitest runs", () => { expect(1 + 1).toBe(2); });
```
Run: `npm test`
Expected: 1 passed. Then delete `src/lib/_smoke.test.ts`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add Vitest unit-test setup"
```

---

## Task 4: Role/permission helper (TDD)

**Files:**
- Create: `src/lib/permissions.ts`
- Test: `src/lib/permissions.test.ts`

> This is the authorization source of truth from the spec's roles × permissions matrix. Pure function → ideal for TDD.

- [ ] **Step 1: Write the failing test**

Create `src/lib/permissions.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { can, type Action } from "./permissions";

describe("can(role, action)", () => {
  const candidateActions: Action[] = [
    "candidate:create", "candidate:edit", "candidate:deactivate",
    "candidate:delete", "suggestion:manage",
  ];

  it("members can do all candidate + suggestion actions", () => {
    for (const a of candidateActions) expect(can("member", a)).toBe(true);
  });

  it("members cannot manage members or view the audit log", () => {
    expect(can("member", "member:manage")).toBe(false);
    expect(can("member", "audit:view")).toBe(false);
  });

  it("admins can do everything members can, plus member mgmt and audit", () => {
    for (const a of candidateActions) expect(can("admin", a)).toBe(true);
    expect(can("admin", "member:manage")).toBe(true);
    expect(can("admin", "audit:view")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/permissions.test.ts`
Expected: FAIL — cannot find module `./permissions`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/permissions.ts`:
```ts
export type Role = "admin" | "member";

export type Action =
  | "candidate:create"
  | "candidate:edit"
  | "candidate:deactivate"
  | "candidate:delete"
  | "suggestion:manage"
  | "member:manage"
  | "audit:view";

const MEMBER_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  "candidate:create",
  "candidate:edit",
  "candidate:deactivate",
  "candidate:delete",
  "suggestion:manage",
]);

const ADMIN_ONLY_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  "member:manage",
  "audit:view",
]);

export function can(role: Role, action: Action): boolean {
  if (role === "admin") {
    return MEMBER_ACTIONS.has(action) || ADMIN_ONLY_ACTIONS.has(action);
  }
  return MEMBER_ACTIONS.has(action);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/permissions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: role/permission helper with unit tests"
```

---

## Task 5: Auth.js (magic-link + Google) with Prisma adapter

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/(auth)/signin/page.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Install Auth.js + adapter + Resend**

```bash
npm i next-auth@beta @auth/prisma-adapter resend
```

- [ ] **Step 2: Generate an auth secret**

```bash
npx auth secret
```
This writes `AUTH_SECRET` into `.env`. If the `auth` CLI is unavailable, instead run
`echo "AUTH_SECRET=$(openssl rand -base64 33)" >> .env`. Confirm `AUTH_SECRET` is present in `.env`.

- [ ] **Step 3: Write the Auth.js config**

Create `src/lib/auth.ts`:
```ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  pages: { signIn: "/signin" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM,
    }),
  ],
});
```

- [ ] **Step 4: Expose the route handlers**

Create `src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 5: Build the sign-in page (Hebrew, both providers)**

Create `src/app/(auth)/signin/page.tsx`:
```tsx
import { signIn } from "@/lib/auth";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl2 border border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100 p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-brand-700 text-center">💞 שידוכים</h1>
        <p className="text-center text-sm text-brand-600 mt-1 mb-6">כניסת שדכנים</p>

        <form
          action={async () => { "use server"; await signIn("google", { redirectTo: "/app" }); }}
        >
          <button className="w-full rounded-lg bg-white border border-brand-200 py-2.5 font-medium text-brand-700 hover:bg-brand-50">
            התחברות עם Google
          </button>
        </form>

        <div className="my-4 text-center text-xs text-slate-400">או</div>

        <form
          action={async (fd: FormData) => {
            "use server";
            await signIn("resend", { email: String(fd.get("email")), redirectTo: "/app" });
          }}
          className="space-y-2"
        >
          <input
            name="email" type="email" required placeholder="האימייל שלך"
            className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-right"
          />
          <button className="w-full rounded-lg bg-brand-500 py-2.5 font-medium text-white hover:bg-brand-600">
            שליחת קישור כניסה
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Redirect the root page based on auth**

Replace `src/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  redirect(session ? "/app" : "/signin");
}
```

- [ ] **Step 7: Manually verify Google sign-in path renders**

Run `npm run dev`, visit `/signin`. Confirm the Hebrew card renders RTL with both options. (Full OAuth requires real Google credentials in `.env`; magic-link requires a Resend key. With keys set, sign in and confirm you reach `/app` — built in Task 7.) Stop the server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: Auth.js sign-in with Google + Resend magic-link"
```

---

## Task 6: Active-community resolution + membership guard

**Files:**
- Create: `src/lib/community.ts`
- Test: `src/lib/community.test.ts`

> `resolveActiveCommunityId` is pure (cookie value + membership list → chosen id) and TDD-tested. `requireMembership` wraps it with `auth()` + DB and is used by server components/actions.

- [ ] **Step 1: Write the failing test for the pure resolver**

Create `src/lib/community.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { resolveActiveCommunityId } from "./community";

const memberships = [
  { communityId: "c1", role: "admin" as const },
  { communityId: "c2", role: "member" as const },
];

describe("resolveActiveCommunityId", () => {
  it("returns null when the user has no memberships", () => {
    expect(resolveActiveCommunityId([], "c1")).toBeNull();
  });
  it("uses the cookie value when it matches a membership", () => {
    expect(resolveActiveCommunityId(memberships, "c2")).toBe("c2");
  });
  it("falls back to the first membership when cookie is missing", () => {
    expect(resolveActiveCommunityId(memberships, undefined)).toBe("c1");
  });
  it("falls back to the first membership when cookie is not a membership", () => {
    expect(resolveActiveCommunityId(memberships, "cX")).toBe("c1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/community.test.ts`
Expected: FAIL — cannot find module `./community`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/community.ts`:
```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/permissions";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const ACTIVE_COMMUNITY_COOKIE = "active_community";

export type MembershipLite = { communityId: string; role: Role };

/** Pure: choose the active community id from memberships + cookie. */
export function resolveActiveCommunityId(
  memberships: MembershipLite[],
  cookieValue: string | undefined,
): string | null {
  if (memberships.length === 0) return null;
  if (cookieValue && memberships.some((m) => m.communityId === cookieValue)) {
    return cookieValue;
  }
  return memberships[0].communityId;
}

export type ActiveContext = {
  userId: string;
  communityId: string;
  role: Role;
  memberships: { communityId: string; communityName: string; role: Role }[];
};

/** Server-only: resolve session → active community + role. Redirects if unauthorized. */
export async function requireMembership(): Promise<ActiveContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const rows = await db.membership.findMany({
    where: { userId: session.user.id },
    include: { community: true },
    orderBy: { createdAt: "asc" },
  });
  if (rows.length === 0) redirect("/no-community");

  const lite: MembershipLite[] = rows.map((r) => ({ communityId: r.communityId, role: r.role }));
  const cookieValue = (await cookies()).get(ACTIVE_COMMUNITY_COOKIE)?.value;
  const communityId = resolveActiveCommunityId(lite, cookieValue)!;
  const active = rows.find((r) => r.communityId === communityId)!;

  return {
    userId: session.user.id,
    communityId,
    role: active.role,
    memberships: rows.map((r) => ({
      communityId: r.communityId,
      communityName: r.community.name,
      role: r.role,
    })),
  };
}
```

- [ ] **Step 4: Make `session.user.id` available (database sessions)**

With the `database` strategy the adapter exposes the user id via the session callback. Add to the `NextAuth({...})` config in `src/lib/auth.ts`:
```ts
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
```
Create `src/types/next-auth.d.ts` to type it:
```ts
import "next-auth";
declare module "next-auth" {
  interface Session { user: { id: string } & import("next-auth").DefaultSession["user"]; }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/lib/community.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: active-community resolution and membership guard"
```

---

## Task 7: Authenticated shell (top nav + community switcher) + protected route

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/page.tsx`
- Create: `src/components/TopNav.tsx`
- Create: `src/components/CommunitySwitcher.tsx`
- Create: `src/app/api/active-community/route.ts`
- Create: `src/app/no-community/page.tsx`

> Auth protection for `/app/*` is handled by `requireMembership()` inside `(app)/layout.tsx`
> (Step 5). No middleware — see the note in the File Structure section.

- [ ] **Step 1: Endpoint to switch active community (sets the cookie)**

Create `src/app/api/active-community/route.ts`:
```ts
import { NextResponse } from "next/server";
import { ACTIVE_COMMUNITY_COOKIE } from "@/lib/community";

export async function POST(req: Request) {
  const { communityId } = await req.json();
  if (typeof communityId !== "string" || !communityId) {
    return NextResponse.json({ error: "communityId required" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACTIVE_COMMUNITY_COOKIE, communityId, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
```

- [ ] **Step 2: Community switcher (client)**

Create `src/components/CommunitySwitcher.tsx`:
```tsx
"use client";
import { useRouter } from "next/navigation";

type Item = { communityId: string; communityName: string };

export function CommunitySwitcher({ items, activeId }: { items: Item[]; activeId: string }) {
  const router = useRouter();
  if (items.length <= 1) {
    const only = items[0];
    return <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-sm text-brand-700">{only?.communityName}</span>;
  }
  return (
    <select
      defaultValue={activeId}
      onChange={async (e) => {
        await fetch("/api/active-community", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ communityId: e.target.value }),
        });
        router.refresh();
      }}
      className="rounded-lg bg-brand-50 px-2.5 py-1 text-sm text-brand-700"
    >
      {items.map((i) => (
        <option key={i.communityId} value={i.communityId}>{i.communityName}</option>
      ))}
    </select>
  );
}
```

- [ ] **Step 3: Top navigation**

Create `src/components/TopNav.tsx`:
```tsx
import Link from "next/link";
import { signOut } from "@/lib/auth";
import { CommunitySwitcher } from "./CommunitySwitcher";
import type { ActiveContext } from "@/lib/community";

export function TopNav({ ctx }: { ctx: ActiveContext }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <nav className="flex items-center gap-5 text-sm">
        <span className="text-lg font-extrabold text-brand-700">💞 שידוכים</span>
        <Link href="/app" className="text-brand-700 font-medium">חיפוש</Link>
        <Link href="/app/matches" className="text-slate-500">שידוכים</Link>
        <Link href="/app/settings" className="text-slate-500">הגדרות</Link>
      </nav>
      <div className="flex items-center gap-3">
        <CommunitySwitcher
          items={ctx.memberships.map((m) => ({ communityId: m.communityId, communityName: m.communityName }))}
          activeId={ctx.communityId}
        />
        <form action={async () => { "use server"; await signOut({ redirectTo: "/signin" }); }}>
          <button className="text-sm text-slate-400 hover:text-slate-600">יציאה</button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Authed layout + placeholder dashboard**

Create `src/app/(app)/layout.tsx`:
```tsx
import { requireMembership } from "@/lib/community";
import { TopNav } from "@/components/TopNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireMembership();
  return (
    <div className="min-h-screen">
      <TopNav ctx={ctx} />
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
```

Create `src/app/(app)/page.tsx`:
```tsx
import { requireMembership } from "@/lib/community";

export default async function Dashboard() {
  const ctx = await requireMembership();
  return (
    <div className="rounded-xl2 border border-brand-200 bg-white p-6">
      <h1 className="text-xl font-bold text-brand-700">ברוך הבא 👋</h1>
      <p className="mt-2 text-sm text-slate-500">
        קהילה פעילה: {ctx.memberships.find((m) => m.communityId === ctx.communityId)?.communityName} · תפקיד: {ctx.role === "admin" ? "מנהל" : "חבר"}
      </p>
      <p className="mt-4 text-sm text-slate-400">ניהול המועמדים יתווסף ב-M2.</p>
    </div>
  );
}
```

Create `src/app/no-community/page.tsx`:
```tsx
export default function NoCommunity() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-xl font-bold text-brand-700">אין לך קהילה עדיין</h1>
        <p className="mt-2 text-sm text-slate-500">פנה למנהל הקהילה כדי שיוסיף אותך.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: build succeeds (type-checks pass). Fix any type errors before continuing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: authenticated shell, top nav, community switcher, route protection"
```

---

## Task 8: Seed script

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Write the seed**

Create `prisma/seed.ts`:
```ts
import { PrismaClient, Gender } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const community = await db.community.upsert({
    where: { id: "seed-community" },
    update: {},
    create: { id: "seed-community", name: "קהילת ירושלים" },
  });

  // Replace with your own email to become admin after first sign-in.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const user = await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: "מנהל הקהילה" },
  });

  await db.membership.upsert({
    where: { userId_communityId: { userId: user.id, communityId: community.id } },
    update: { role: "admin" },
    create: { userId: user.id, communityId: community.id, role: "admin" },
  });

  const sample = [
    { name: "יוסי כהן", gender: Gender.male, ageManual: 30, occupation: "מהנדס", heightCm: 178, requirements: "מחפש בחורה רצינית, משפחתית, גילאי 26–31." },
    { name: "דנה לוי", gender: Gender.female, ageManual: 27, occupation: "מורה", heightCm: 165, requirements: "מחפשת בן זוג רציני, בעל מקצוע, גילאי 28–33." },
  ];
  for (const c of sample) {
    await db.candidate.create({
      data: { ...c, communityId: community.id, createdById: user.id },
    });
  }
  console.log("Seeded community, admin membership, and sample candidates.");
}

main().finally(() => db.$disconnect());
```

- [ ] **Step 2: Run the seed**

```bash
SEED_ADMIN_EMAIL="your-real-email@example.com" npm run db:seed
```
Expected: "Seeded community, admin membership, and sample candidates." Then signing in with that email lands you in "קהילת ירושלים" as admin.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: seed script (community, admin membership, sample candidates)"
```

---

## Task 9: Milestone verification

- [ ] **Step 1: Full test run**

Run: `npm test`
Expected: all unit tests pass (permissions + community resolver).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Manual smoke (with real `.env`)**

With `DATABASE_URL`, `AUTH_SECRET`, and at least one provider credential set:
- Visit `/` → redirected to `/signin`.
- Sign in (Google or magic-link with the seeded admin email) → redirected to `/app`.
- Dashboard shows the community name and role "מנהל".
- If you add a second community + membership, the switcher appears and switching refreshes context.

- [ ] **Step 4: Tag the milestone**

```bash
git tag m1-foundation
```

---

## Notes for M2 (not implemented here)
- Candidate field registry (`src/lib/fields.ts`), AuditLog write helper (`src/lib/audit.ts`), candidate CRUD server actions + UI, `createdBy` display, deactivate/delete flows — all build directly on the schema and helpers created in M1.
