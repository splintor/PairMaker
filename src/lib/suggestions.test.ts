import { describe, expect, it } from "vitest";
import { makePairKey, oppositeGender, statusIndex } from "./suggestions";

describe("makePairKey", () => {
  it("is order-independent", () => {
    expect(makePairKey("a", "b")).toBe(makePairKey("b", "a"));
  });
  it("joins sorted ids", () => {
    expect(makePairKey("z9", "a1")).toBe("a1:z9");
  });
});

describe("oppositeGender", () => {
  it("flips male/female", () => {
    expect(oppositeGender("male")).toBe("female");
    expect(oppositeGender("female")).toBe("male");
  });
});

describe("statusIndex", () => {
  it("orders the funnel", () => {
    expect(statusIndex("proposed")).toBe(0);
    expect(statusIndex("closed")).toBe(3);
  });
});
