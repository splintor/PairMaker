import { describe, expect, it } from "vitest";
import { can, type Action } from "./permissions";

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
