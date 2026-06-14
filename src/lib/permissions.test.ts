import { describe, expect, it } from "vitest";
import { can, canEditCandidate, type Action } from "./permissions";

describe("can(role, action)", () => {
  const candidateActions: Action[] = [
    "candidate:create",
    "candidate:edit",
    "candidate:deactivate",
    "candidate:delete",
    "suggestion:manage",
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
