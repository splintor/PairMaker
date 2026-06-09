import { describe, expect, it } from "vitest";
import { displayAge, ageLabel } from "./candidate-display";

describe("ageLabel", () => {
  it("uses בן for male", () => expect(ageLabel("male", 30)).toBe("בן 30"));
  it("uses בת for female", () => expect(ageLabel("female", 27)).toBe("בת 27"));
  it("returns null when age is null", () => expect(ageLabel("male", null)).toBeNull());
});

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
