import { describe, expect, it } from "vitest";
import {
  displayAge,
  ageLabel,
  statusLabel,
  ageToBirthdate,
  ageWithBirthYear,
  smokingLabel,
  creatorLabel,
  addedByLabel,
  firstName,
  familyStatusLabel,
  relationLabel,
} from "./candidate-display";

describe("familyStatusLabel", () => {
  it("gender-matches the word", () => {
    expect(familyStatusLabel("single", "male")).toBe("רווק");
    expect(familyStatusLabel("single", "female")).toBe("רווקה");
    expect(familyStatusLabel("divorced", "female")).toBe("גרושה");
    expect(familyStatusLabel("widowed", "male")).toBe("אלמן");
  });
  it("uses slash form when gender is unknown", () => {
    expect(familyStatusLabel("single", null)).toBe("רווק/ה");
  });
  it("returns the raw value for an unknown key", () => {
    expect(familyStatusLabel("xyz", "male")).toBe("xyz");
  });
});

describe("relationLabel", () => {
  it("gender-matches", () => {
    expect(relationLabel("male")).toBe("איך הוא קשור אלי?");
    expect(relationLabel("female")).toBe("איך היא קשורה אלי?");
    expect(relationLabel(null)).toBe("איך הוא/היא קשור/ה אלי?");
  });
});

describe("firstName", () => {
  it("drops the last word of a multi-word name", () => {
    expect(firstName("ריקי מאיר")).toBe("ריקי");
    expect(firstName("John Paul Smith")).toBe("John Paul");
  });
  it("keeps a single-word name as-is", () => {
    expect(firstName("אליס")).toBe("אליס");
  });
  it("trims and handles extra spaces", () => {
    expect(firstName("  דני   לוי  ")).toBe("דני");
  });
});

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

describe("addedByLabel", () => {
  it("male", () => expect(addedByLabel("male")).toBe("נוסף ע״י"));
  it("female", () => expect(addedByLabel("female")).toBe("נוספה ע״י"));
});
