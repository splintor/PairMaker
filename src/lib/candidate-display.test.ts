import { describe, expect, it } from "vitest";
import { displayAge } from "./candidate-display";

describe("displayAge", () => {
  const now = new Date("2026-06-09T00:00:00Z");

  it("derives age from birthdate when present", () => {
    expect(displayAge({ birthdate: new Date("1996-06-09T00:00:00Z"), ageManual: null }, now)).toBe(30);
  });

  it("uses ageManual when no birthdate", () => {
    expect(displayAge({ birthdate: null, ageManual: 27 }, now)).toBe(27);
  });

  it("returns null when neither is set", () => {
    expect(displayAge({ birthdate: null, ageManual: null }, now)).toBeNull();
  });
});
