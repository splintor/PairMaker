import { describe, expect, it } from "vitest";
import {
  displayAge,
  ageLabel,
  statusLabel,
  ageToBirthdate,
  ageWithBirthYear,
  smokingLabel,
  creatorLabel,
} from "./candidate-display";

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
    expect(displayAge({ birthdate: new Date("1996-06-09T00:00:00Z") }, now)).toBe(30);
  });

  it("returns null when no birthdate", () => {
    expect(displayAge({ birthdate: null }, now)).toBeNull();
  });
});

describe("ageToBirthdate", () => {
  const now = new Date("2026-06-09T00:00:00Z");
  it("round-trips with displayAge", () => {
    expect(displayAge({ birthdate: ageToBirthdate(30, now) }, now)).toBe(30);
  });
  it("uses currentYear - age", () => {
    expect(ageToBirthdate(30, now).getUTCFullYear()).toBe(1996);
  });
});

describe("ageWithBirthYear", () => {
  const now = new Date("2026-06-09T00:00:00Z");
  it("formats age with birth year", () => {
    expect(ageWithBirthYear({ birthdate: new Date("1996-06-09T00:00:00Z") }, now)).toBe(
      "30 (שנת לידה: 1996)",
    );
  });
  it("returns null without birthdate", () => {
    expect(ageWithBirthYear({ birthdate: null }, now)).toBeNull();
  });
});

describe("smokingLabel", () => {
  it("male", () => expect(smokingLabel("male")).toBe("מעשן"));
  it("female", () => expect(smokingLabel("female")).toBe("מעשנת"));
});

describe("creatorLabel", () => {
  it("prefers the name", () =>
    expect(creatorLabel({ name: "שמוליק", email: "s@x.com" })).toBe("שמוליק"));
  it("falls back to email when no name", () =>
    expect(creatorLabel({ name: null, email: "s@x.com" })).toBe("s@x.com"));
  it("returns — when neither and when null", () => {
    expect(creatorLabel({ name: null, email: null })).toBe("—");
    expect(creatorLabel(null)).toBe("—");
  });
});
