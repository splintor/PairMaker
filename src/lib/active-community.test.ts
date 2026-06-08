import { describe, expect, it } from "vitest";
import { resolveActiveCommunityId } from "./active-community";

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
