import { describe, expect, it } from "vitest";
import { describeAudit } from "./audit-format";

describe("describeAudit", () => {
  it("candidate actions", () => {
    expect(describeAudit({ entityType: "candidate", action: "create", entityLabel: "דנה" })).toContain("דנה");
    expect(describeAudit({ entityType: "candidate", action: "create", entityLabel: "דנה" })).toContain("נוסף");
    expect(describeAudit({ entityType: "candidate", action: "delete", entityLabel: "דנה" })).toContain("נמחק");
    expect(describeAudit({ entityType: "candidate", action: "deactivate", entityLabel: "דנה" })).toContain("הושבת");
  });
  it("suggestion actions", () => {
    expect(describeAudit({ entityType: "suggestion", action: "create", entityLabel: "א ↔ ב" })).toContain("הוצע שידוך");
  });
  it("membership actions", () => {
    expect(describeAudit({ entityType: "membership", action: "create", entityLabel: "x@y.com" })).toContain("נוסף");
    expect(describeAudit({ entityType: "membership", action: "delete", entityLabel: "x@y.com" })).toContain("הוסר");
  });
  it("community rename", () => {
    expect(describeAudit({ entityType: "community", action: "update", entityLabel: "קהילה חדשה" })).toContain("שם הקהילה");
  });
  it("falls back gracefully for unknown combos", () => {
    expect(describeAudit({ entityType: "community", action: "delete", entityLabel: "X" })).toContain("X");
  });
});
