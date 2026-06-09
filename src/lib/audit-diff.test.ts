import { describe, expect, it } from "vitest";
import { computeChanges } from "./audit-diff";

describe("computeChanges", () => {
  it("returns only changed keys with from/to", () => {
    const before = { name: "דנה", ageManual: 27, city: "ירושלים" };
    const after = { name: "דנה", ageManual: 28, city: "תל אביב" };
    expect(computeChanges(before, after)).toEqual({
      ageManual: { from: 27, to: 28 },
      city: { from: "ירושלים", to: "תל אביב" },
    });
  });

  it("captures added and removed keys", () => {
    expect(computeChanges({ a: 1 }, { b: 2 })).toEqual({
      a: { from: 1, to: undefined },
      b: { from: undefined, to: 2 },
    });
  });

  it("returns empty object when nothing changed", () => {
    expect(computeChanges({ a: 1 }, { a: 1 })).toEqual({});
  });

  it("treats nested detail objects by deep equality", () => {
    const before = { details: { sector: "haredi" } };
    const after = { details: { sector: "haredi" } };
    expect(computeChanges(before, after)).toEqual({});
  });
});
