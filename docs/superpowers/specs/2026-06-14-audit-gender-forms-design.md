# Gendered Candidate Audit Forms — Design

**Date:** 2026-06-14

## Goal

Audit-log entries about candidates currently use the bi-gender form
(`מועמד/ת "X" נוסף/ה`). Because every candidate has a known, required gender,
render the grammatically correct single-gender form instead
(`מועמד "X" נוסף` / `מועמדת "X" נוספה`), falling back to the bi-gender form only
when gender is genuinely unavailable.

## Scope

Candidate entries only. Members (`חבר/ה`) stay bi-gender — we don't store users'
gender. Suggestions, community, and login entries have no gendered noun and are
untouched.

No schema change, no DB migration.

## Data flow

The pure formatter `describeAudit()` needs gender, which the `AuditLog` row does
not carry. Gender is supplied at render time by the activity page:

1. `describeAudit(view)` gains an optional field on its input type:
   `gender?: "male" | "female" | null`.
2. The activity page (server component), after loading the log rows:
   - Collects the distinct `entityId`s of rows where `entityType === "candidate"`.
   - Runs one batched query:
     `db.candidate.findMany({ where: { communityId, id: { in: ids } }, select: { id: true, gender: true } })`
     → `Map<id, "male" | "female">`.
   - For each row, resolves gender as:
     `map.get(row.entityId)` ?? (when `action === "delete"`) `snapshot.gender` ?? `null`.
     The delete snapshot stores the full candidate, so deleted candidates still
     render gendered.
   - Calls `describeAudit({ ...row, gender })`.

Gender is effectively immutable in this domain, so "current gender" equals
"gender at action time".

## Formatter behavior

For `entityType === "candidate"`, pick noun + verb by gender:

| action | male | female | unknown (fallback) |
|---|---|---|---|
| create | מועמד "X" נוסף | מועמדת "X" נוספה | מועמד/ת "X" נוסף/ה |
| update | מועמד "X" עודכן | מועמדת "X" עודכנה | מועמד/ת "X" עודכן/ה |
| deactivate | מועמד "X" הושבת | מועמדת "X" הושבתה | מועמד/ת "X" הושבת/ה |
| reactivate | מועמד "X" הוחזר לפעילות | מועמדת "X" הוחזרה לפעילות | מועמד/ת "X" הוחזר/ה לפעילות |
| delete | מועמד "X" נמחק | מועמדת "X" נמחקה | מועמד/ת "X" נמחק/ה |

The `{ before, label, after }` split is preserved (`label` = the candidate name),
so the existing link rendering on the activity page keeps working unchanged.
The `noun` becomes the start of `before`; the gendered verb becomes `after`.

When gender is absent or `entityType !== "candidate"`, behavior is byte-for-byte
identical to today.

## Testing

Extend `src/lib/audit-format.test.ts`:
- male form: `auditSentence({ entityType: "candidate", action: "create", entityLabel: "X", gender: "male" })` contains `מועמד "` and `נוסף` (and NOT `מועמד/ת`).
- female form: same with `gender: "female"` contains `מועמדת` and `נוספה`.
- fallback unchanged: with no `gender`, still contains `מועמד/ת` and `נוסף/ה`.

Existing 64 tests stay green because `gender` is optional and absent in them.

## Out of scope

- Gendering member entries (no data).
- Any schema/migration work.
- Backfilling or changing how audit rows are written (write path is unchanged).
