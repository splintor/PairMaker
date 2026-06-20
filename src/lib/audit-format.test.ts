import { describe, expect, it } from "vitest";
import { auditSentence, auditHref, describeAudit, describeAuditSegments } from "./audit-format";

describe("auditSentence", () => {
  it("candidate actions", () => {
    expect(auditSentence({ entityType: "candidate", action: "create", entityLabel: "דנה" })).toContain("דנה");
    expect(auditSentence({ entityType: "candidate", action: "create", entityLabel: "דנה" })).toContain("נוסף");
    expect(auditSentence({ entityType: "candidate", action: "delete", entityLabel: "דנה" })).toContain("נמחק");
    expect(auditSentence({ entityType: "candidate", action: "deactivate", entityLabel: "דנה" })).toContain("הושבת");
  });
  it("suggestion actions", () => {
    expect(auditSentence({ entityType: "suggestion", action: "create", entityLabel: "א ↔ ב" })).toContain("הוצע שידוך");
  });
  it("membership actions", () => {
    expect(auditSentence({ entityType: "membership", action: "create", entityLabel: "x@y.com" })).toContain("נוסף");
    expect(auditSentence({ entityType: "membership", action: "delete", entityLabel: "x@y.com" })).toContain("הוסר");
  });
  it("community rename", () => {
    expect(auditSentence({ entityType: "community", action: "update", entityLabel: "קהילה חדשה" })).toContain("שם הקהילה");
  });
  it("uses the male form when the candidate is male", () => {
    const s = auditSentence({ entityType: "candidate", action: "create", entityLabel: "דניאל", gender: "male" });
    expect(s).toContain('מועמד "');
    expect(s).toContain("נוסף");
    expect(s).not.toContain("מועמד/ת");
    expect(s).not.toContain("נוסף/ה");
  });
  it("uses the female form when the candidate is female", () => {
    const s = auditSentence({ entityType: "candidate", action: "create", entityLabel: "דנה", gender: "female" });
    expect(s).toContain("מועמדת");
    expect(s).toContain("נוספה");
    expect(s).not.toContain("מועמד/ת");
  });
  it("gendered female verbs for all candidate actions", () => {
    const f = (action: string) => auditSentence({ entityType: "candidate", action, entityLabel: "דנה", gender: "female" });
    expect(f("update")).toContain("עודכנה");
    expect(f("deactivate")).toContain("הושבתה");
    expect(f("reactivate")).toContain("הוחזרה לפעילות");
    expect(f("delete")).toContain("נמחקה");
  });
  it("falls back to bi-gender when candidate gender is absent", () => {
    const s = auditSentence({ entityType: "candidate", action: "create", entityLabel: "X" });
    expect(s).toContain("מועמד/ת");
    expect(s).toContain("נוסף/ה");
  });
  it("contact actions fall back to a single-name sentence without related data", () => {
    expect(auditSentence({ entityType: "candidate", action: "contact", entityLabel: "דנה" })).toContain("נשלחה הודעת היכרות ל");
    expect(auditSentence({ entityType: "candidate", action: "contact", entityLabel: "דנה" })).toContain("דנה");
    expect(auditSentence({ entityType: "membership", action: "contact", entityLabel: "יוסי" })).toContain("נשלחה הודעה לשדכן/ית");
    expect(auditSentence({ entityType: "membership", action: "contact", entityLabel: "יוסי" })).toContain("יוסי");
  });
  it("intro contact mentions and links both candidates (to A about B)", () => {
    const view = {
      entityType: "candidate",
      action: "contact",
      entityLabel: "דנה",
      entityId: "a1",
      contact: { about: { id: "b1", name: "יוסי" } },
    };
    expect(auditSentence(view)).toBe("נשלחה הודעה לדנה בנוגע ליוסי");
    const segs = describeAuditSegments(view);
    expect(segs.find((s) => s.text === "דנה")?.href).toBe("/app/candidates/a1");
    expect(segs.find((s) => s.text === "יוסי")?.href).toBe("/app/candidates/b1");
  });
  it("member-pitch contact mentions C and links A and B (to C to match A to B)", () => {
    const view = {
      entityType: "membership",
      action: "contact",
      entityLabel: "משה",
      entityId: "u1",
      contact: { source: { id: "a1", name: "דנה" }, target: { id: "b1", name: "יוסי" } },
    };
    expect(auditSentence(view)).toBe("נשלחה הודעה למשה להצעת שידוך בין דנה ליוסי");
    const segs = describeAuditSegments(view);
    expect(segs.find((s) => s.text === "דנה")?.href).toBe("/app/candidates/a1");
    expect(segs.find((s) => s.text === "יוסי")?.href).toBe("/app/candidates/b1");
    // The member (C) is named in plain text, not linked.
    expect(segs.some((s) => s.text.includes("משה") && !s.href)).toBe(true);
  });
  it("login action", () => {
    expect(auditSentence({ entityType: "auth", action: "login", entityLabel: "יוסי" })).toContain("התחברות");
    expect(auditSentence({ entityType: "auth", action: "login", entityLabel: "יוסי" })).toContain("יוסי");
  });
  it("keeps the entity name as a separable label", () => {
    const view = { entityType: "candidate", action: "update", entityLabel: "דנה לוי" };
    const { before, label, after } = describeAudit(view);
    expect(label).toBe("דנה לוי");
    expect(`${before}${label}${after}`).toBe(auditSentence(view));
  });
  it("falls back gracefully for unknown combos", () => {
    expect(auditSentence({ entityType: "community", action: "delete", entityLabel: "X" })).toContain("X");
  });
});

describe("auditHref", () => {
  it("links candidates to their profile (non-delete)", () => {
    expect(auditHref({ entityType: "candidate", entityId: "c1", action: "update" })).toBe("/app/candidates/c1");
  });
  it("links suggestions to the matches board anchor", () => {
    expect(auditHref({ entityType: "suggestion", entityId: "s1", action: "create" })).toBe("/app/matches#s1");
  });
  it("does not link deletes", () => {
    expect(auditHref({ entityType: "candidate", entityId: "c1", action: "delete" })).toBeNull();
  });
  it("does not link members or community", () => {
    expect(auditHref({ entityType: "membership", entityId: "u1", action: "create" })).toBeNull();
    expect(auditHref({ entityType: "community", entityId: "x", action: "update" })).toBeNull();
  });
  it("does not link auth/login events", () => {
    expect(auditHref({ entityType: "auth", entityId: "u1", action: "login" })).toBeNull();
  });
});
