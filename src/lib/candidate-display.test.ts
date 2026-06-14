import { describe, expect, it } from "vitest";
import { displayAge, ageLabel, statusLabel } from "./candidate-display";

describe("ageLabel", () => {
  it("uses בן for male", () => expect(ageLabel("male", 30)).toBe("בן 30"));
  it("uses בת for female", () => expect(ageLabel("female", 27)).toBe("בת 27"));
  it("returns null when age is null", () => expect(ageLabel("male", null)).toBeNull());
});

describe("statusLabel", () => {
  it("male active/inactive", () => {
    expect(statusLabel("male", true)).toBe("פעיל");
    expect(statusLabel("male", false)).toBe("לא פעיל");
  });
  it("female active/inactive", () => {
    expect(statusLabel("female", true)).toBe("פעילה");
    expect(statusLabel("female", false)).toBe("לא פעילה");
  });
  it("falls back to bi-gender when gender is unknown", () => {
    expect(statusLabel(null, true)).toBe("פעיל/ה");
    expect(statusLabel(undefined, false)).toBe("לא פעיל/ה");
  });
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
