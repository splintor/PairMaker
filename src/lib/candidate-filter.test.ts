import { describe, expect, it } from "vitest";
import { parseCandidateFilter } from "./candidate-filter";

describe("parseCandidateFilter", () => {
  it("defaults to all", () => {
    expect(parseCandidateFilter(undefined)).toBe("all");
    expect(parseCandidateFilter("bogus")).toBe("all");
  });
  it("accepts mine", () => {
    expect(parseCandidateFilter("mine")).toBe("mine");
  });
});
