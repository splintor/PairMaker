# Shidduch Matchmaker — System Design

**Date:** 2026-06-08
**Status:** Approved (pending written-spec review)

## 1. Purpose

A web app + WhatsApp bot for small Hebrew-speaking communities whose matchmakers
(שדכנים) share marriage-match candidates in a WhatsApp group. The system:

- Stores all candidates in a searchable database with rich, multi-criteria search.
- Lets matchmakers record which matches were already suggested to each candidate, and
  track each suggestion through a status funnel.
- Lets matchmakers deactivate a candidate (with a reason) so they drop out of searches.
- Runs a WhatsApp bot that **auto-adds** candidates from group messages, **reports** each
  new candidate back to the group (with details + a deep link), and **applies corrections**
  posted as replies.

UI and bot are **in Hebrew**, RTL. The app must be visually pleasant and work well on both
mobile and desktop. Built entirely on **free-tier** tooling, Vercel-centric. Expected scale:
**< 1000 candidates per community**.

> This system is not related to Wix in any way.

## 2. Key product decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Who logs in | **Matchmakers only.** Candidates never log in. |
| Tenancy | **Multi-community (multi-tenant).** Every row scoped to a `communityId`. |
| WhatsApp ingestion | **Auto-read the group** via an always-on Baileys worker. |
| Parsing | **Claude Haiku** extracts fields from free-text Hebrew. |
| Ingestion gate | **None.** Candidate is created immediately; correction loop + audit log are the safety net. |
| Bot reporting | Bot replies to the original message: details + deep link to the candidate. |
| Corrections | A **quoted reply to the bot's confirmation** triggers an update. **Anyone in the group** may correct. |
| Login methods | **Email magic-link + Google** (Auth.js). |
| Custom fields | **Developer-defined in code** via a single field registry. Adding a field = one entry, no migration. |
| Member permissions | **Full CRUD on any candidate** (add / edit / deactivate / **delete**) + manage suggestions. No per-record ownership lock. |
| Admin permissions | All member abilities **+ manage members** (add / edit / delete) **+ view the activity log**. |
| Provenance | Candidate stores **`createdBy`** — the member who added it. |
| Audit | **Every data modification is logged** (community-scoped); admins review it in a comfortable activity-log UI. |
| Build order | **Web app first (full CRUD, fully usable standalone); WhatsApp bot strictly second.** |
| Match funnel | **Proposed → Accepted → Meeting → Closed** (+ outcome). |
| Matching rule | **Opposite gender.** Search for a candidate defaults to the opposite gender. |
| Filters | **All optional.** Nothing constrains results unless explicitly set ("I don't care" by default). |
| Visual style | **Lavender-periwinkle**: soft, rounded, warm, blue-led, subtle peach accent. |

## 3. Architecture

Three components:

1. **WhatsApp Worker** — Node/TypeScript, **Baileys** (unofficial WhatsApp Web client),
   always-on, hosted free on Render/Railway/Fly (or the operator's own machine). Bidirectional:
   reads group messages and posts back into the group. One WhatsApp link **per community**
   (multi-session). Deliberately thin — it holds no business logic and no AI/DB keys; it only
   relays messages to/from the web app over an authenticated HTTP channel.

2. **Next.js app on Vercel** — App Router, TypeScript, Tailwind + shadcn/ui, full RTL Hebrew.
   Hosts the web UI and the API routes (`/api/ingest`, `/api/correct`, ingestion callbacks,
   auth). Calls **Claude Haiku** for parsing. Owns all secrets.

3. **Data stores (free tier)** — **Neon/Vercel Postgres** via **Prisma** for relational data;
   **Vercel Blob** for candidate photos.

```
WhatsApp group  ⇄  Worker (Baileys)  ⇄  Next.js /api  ⇄  Postgres + Blob
                                          │
                                          └── Claude Haiku (parse / interpret corrections)
```

### Trade-offs / risks
- **Unofficial WhatsApp client (Baileys):** carries Meta ToS / ban risk and requires a
  persistent connection (the reason the worker lives outside Vercel's serverless model).
  Accepted deliberately as the only free way to auto-read an existing group. Mitigation: use a
  dedicated WhatsApp number per community; keep the worker resilient with session persistence
  and reconnect.
- **Auto-create with no approval gate:** mitigated by the correction loop + full edit/audit
  history + direct editing in the app.

## 4. Data model (Postgres / Prisma)

All entity rows carry `communityId` and are filtered by it on every query.

- **Community** — a tenant. `id, name, createdAt`. Holds WhatsApp link config (group JID,
  session reference) and an ingest shared-secret.
- **User** (matchmaker) — `id, email, name, image`. Auth.js standard tables
  (`Account`, `Session`, `VerificationToken`).
- **Membership** — join of `User`↔`Community` with `role` (`admin` | `member`). A user may
  belong to multiple communities; the active community is chosen via the switcher.

  **Roles & permissions** (enforced on every API route, server-side, scoped to the active community):

  | Capability | member | admin |
  |---|:---:|:---:|
  | Add / edit / deactivate / **delete** any candidate | ✅ | ✅ |
  | Create / update suggestions (match tracking) | ✅ | ✅ |
  | Add / edit / **delete** members, assign roles | — | ✅ |
  | View the activity (audit) log | — | ✅ |

  A community must always retain at least one admin (last-admin guard on delete/role-change).
- **Candidate** — core columns:
  `id, communityId, name, gender ('male'|'female'), birthdate?, ageManual?, occupation?,
  heightCm?, requirements (text), city?, photoUrl?, status ('active'|'inactive'),
  deactivationReason?, deactivationNote?, deactivatedAt?,
  createdBy (userId — the member who added it), createdAt, updatedAt`.
  Plus **`details JSONB`** holding all extended/custom field values, keyed by field `key`.
  Provenance: `sourceMessageId?, rawText?, parsedJson?`.
  (Age handling: store `birthdate` when known and derive displayed age; fall back to
  `ageManual` when only an age was given in the message. Age-range search uses the derived/manual age.)
- **FieldDefinition registry** — **in code, not the DB.** A single TypeScript array; each entry:
  `{ key, label (he), type: 'text'|'number'|'select'|'multiselect'|'boolean', options?,
  searchable?, showInCard?, group? }`. This array is the single source of truth that drives:
  candidate **form** rendering + validation, the **card/profile** display, and the **search
  filters**. Adding a field = add one entry. Values live in `Candidate.details` (no migration).
  Core fields (name, gender, age, occupation, height, requirements, city) are real columns and
  are represented in the same registry shape for uniform rendering.
- **Suggestion** (match) — `id, communityId, candidateAId, candidateBId` (constrained to one
  male + one female), `status ('proposed'|'accepted'|'meeting'|'closed'), outcome?
  ('engaged'|'not_a_fit'|'on_hold'|...), notes (timeline/free text), createdBy, createdAt,
  updatedAt`. A **unique constraint on the unordered pair** prevents re-suggesting the same
  couple. Surfaced on both candidates' profiles.
- **WhatsAppMessageLink** — `id, communityId, candidateId, messageId (the bot's confirmation
  message id), originalMessageId?, createdAt`. Lets the worker map a **quoted reply** back to
  the candidate for corrections.
- **AuditLog** — a single community-wide log of **every data modification**, written by a
  shared helper that all mutating operations call.
  `id, communityId, entityType ('candidate'|'suggestion'|'membership'|'community'),
  entityId, entityLabel (human name snapshot, e.g. the candidate's name),
  action ('create'|'update'|'deactivate'|'reactivate'|'delete'),
  source ('user'|'bot'), actor? (userId), changes (JSON: field → {from,to}),
  snapshot? (full record copy — required on delete so admins can see what was removed),
  note?, createdAt`. Bot corrections are recorded here with `source='bot'`.
  Deletes are **hard deletes** of the entity row, but the AuditLog retains the snapshot, so the
  change remains visible (and is the basis for the activity-log UI).

## 5. WhatsApp ingestion & correction flow

**A · New candidate**
1. Worker observes a new group message that is **not** a reply to a bot confirmation.
   It POSTs `{ communityId, rawText, media?, messageId }` to `/api/ingest` with the shared secret.
2. `/api/ingest`: uploads any photo to Blob → calls Claude Haiku to extract fields into the
   registry shape → **creates an active Candidate** (writes provenance) → builds a confirmation
   message (key details + deep link `https://<app>/c/<candidateId>`) → responds to the worker
   with `{ candidateId, confirmationText }`.
3. Worker sends `confirmationText` **as a reply to the original message** → receives the sent
   message id → POSTs it back (`/api/ingest/link`) so the app stores a **WhatsAppMessageLink**
   (`messageId ↔ candidate`).

**B · Correction**
4. Someone posts a **quoted reply to the bot's confirmation** (e.g. «הגיל לא נכון, היא בת 28»).
5. Worker recognizes the quoted message id as a known confirmation → POSTs
   `{ communityId, quotedMessageId, correctionText }` to `/api/correct`.
6. `/api/correct`: looks up the candidate via the link → Claude Haiku interprets the correction
   into a field-level diff → **updates the candidate + writes an `AuditLog` entry (source='bot')** →
   responds with a short summary.
7. Worker posts a reply: «עודכן ✅ גיל: 28».

Non-correction replies (e.g. "תודה") are interpreted by Haiku as no-ops and ignored.

## 6. Web app — screens & behavior

**Visual language:** lavender-periwinkle palette (indigo/violet-blue gradients, soft rounded
corners ~16px, subtle peach accent on secondary tags), system Hebrew font, RTL throughout.
Responsive: filters collapse behind a button on mobile; card grids reflow to a single column.

- **Auth** — Auth.js sign-in (magic-link + Google). After sign-in, pick active community (or
  auto-select if only one). Authorization: a user only ever accesses their member communities.
- **Search (main workspace)** — top nav (logo · Search / Matches / Settings · "to-handle"
  badge · community switcher · avatar). **Filter panel:** gender (defaults to opposite of the
  context candidate when searching for a match; otherwise free), **optional** age range,
  **optional** height range, occupation, plus any `searchable` custom fields auto-rendered from
  the registry, and an "include inactive" toggle. **All filters default to "any"**; each has a
  one-tap clear. Results render as candidate cards; sortable; inactive candidates hidden unless
  toggled.
- **Candidate profile** — avatar/photo, core + custom fields (custom auto-rendered from
  registry), spouse-requirements block, status pill. Actions: **+ הצעת שידוך** (suggest a
  match), **edit**, **deactivate** (with reason select + note), **delete** (confirm dialog;
  hard delete + audit snapshot), view **edit history** (this candidate's slice of the audit
  log), and provenance: **"נוסף ע״י <member>"** plus, later, "auto-created from WhatsApp". Right
  side: **match tracking** — each Suggestion shows partner, status pill, the inline funnel
  (current stage bold), outcome on closed ones, and notes.
- **Suggest-a-match flow** — from a candidate, search the opposite-gender pool (reusing the
  search filters), pick a partner, create a Suggestion (`proposed`). Blocked if the pair was
  already suggested (shows the existing suggestion instead).
- **Matches view** — list/board of all suggestions in the community by status, to manage the
  funnel and update statuses/outcomes.
- **Settings → Members (admin-only)** — list of members with role; admin can **add** a member
  (by email — they sign in via magic-link/Google), **edit** role, and **delete** a member.
  Last-admin guard prevents removing/demoting the final admin. (Members who aren't admins don't
  see this screen.) Also shows WhatsApp link status / QR pairing (phase 2) and the
  deactivation-reason list. Custom field definitions are code-managed; Settings only displays them.
- **Activity log (admin-only)** — a comfortable, readable feed of the community's `AuditLog`:
  each row reads as a Hebrew sentence ("דנה כהן נערכה ע״י יוסי — גיל: 27 ← 28", "מועמד נמחק ע״י
  שרה", "חבר חדש נוסף"). Filterable by entity type, action, actor, and date range; expandable to
  show the full field-level diff (and the snapshot for deletes). This is the admin's window into
  "what changed in my community."
- **"To-handle" inbox** — surfaces items needing a human glance (e.g. low-confidence parses,
  bot couldn't interpret a correction). Non-blocking. (Phase 2.)

## 7. Deactivation

`status='inactive'` + `deactivationReason` (select: מצא/ה זיווג · בהפסקה · עזב/ה את הקהילה ·
אחר) + optional `deactivationNote` + `deactivatedAt`. Inactive candidates are **excluded from
search by default** but remain viewable and reactivatable. Deactivating does not delete history.

## 8. Custom fields — developer workflow

1. Add an entry to the field registry array (`key`, Hebrew `label`, `type`, `options?`,
   `searchable?`, `showInCard?`, `group?`).
2. Redeploy. The field now appears in the add/edit form, on the card/profile (if `showInCard`),
   and as a search filter (if `searchable`). Values are stored in `Candidate.details` JSONB —
   **no database migration required.**

## 9. Security & privacy

- Sensitive personal data: all access gated by Auth.js; every query scoped to the user's
  community membership; no public candidate pages (deep links require login).
- Worker↔app traffic authenticated with a per-community shared secret; ingest endpoints reject
  unknown communities/secrets.
- Photos in Vercel Blob referenced by unguessable URLs; served only within authenticated views.

## 10. Build sequence

**Phase 1 — Core web app (build and use this first; fully standalone, no bot):**
schema/Prisma, auth + multi-tenant, **roles & permission enforcement**, candidates **full CRUD**
(add / edit / deactivate / **delete**, with `createdBy`), field registry, search (optional
filters), candidate profile, suggestions / match tracking, deactivation, **member management
(admin)**, the **AuditLog helper wired into every mutation**, and the **activity-log UI (admin)**.
All candidate entry is manual in this phase.

**Phase 2 — WhatsApp worker (only after phase 1 is in use):** Baileys worker, `/api/ingest` +
`/api/correct` + link callbacks, Haiku parsing, confirmation + correction loop, per-community
pairing. Ingestion and corrections write through the same AuditLog helper (`source='bot'`).

Each sub-project gets its own implementation plan.

## 11. Out of scope (YAGNI, for now)

- Candidate-facing login or self-service profiles.
- Automated match *suggestions* / scoring algorithms (matchmakers choose manually).
- Admin UI for creating custom fields (code-managed by decision).
- Billing/payments. Analytics dashboards.
- Duplicate-detection on auto-add beyond a basic name+age heads-up (can be added later).
