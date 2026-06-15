import { describe, expect, it } from "vitest";
import { relativeTimeHe } from "./relative-time";

const NOW = new Date("2026-06-15T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

describe("relativeTimeHe", () => {
  it("very recent → עכשיו", () => {
    expect(relativeTimeHe(ago(30 * SEC), NOW)).toBe("עכשיו");
  });
  it("minutes", () => {
    expect(relativeTimeHe(ago(5 * MIN), NOW)).toBe("לפני 5 דקות");
  });
  it("hours", () => {
    expect(relativeTimeHe(ago(3 * HOUR), NOW)).toBe("לפני 3 שעות");
  });
  it("yesterday", () => {
    expect(relativeTimeHe(ago(1 * DAY), NOW)).toBe("אתמול");
  });
  it("weeks", () => {
    expect(relativeTimeHe(ago(3 * WEEK), NOW)).toBe("לפני 3 שבועות");
    expect(relativeTimeHe(ago(2 * WEEK), NOW)).toBe("לפני שבועיים");
  });
  it("months", () => {
    expect(relativeTimeHe(ago(60 * DAY), NOW)).toBe("לפני חודשיים");
  });
});
