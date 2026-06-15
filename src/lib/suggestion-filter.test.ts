import { describe, expect, it } from "vitest";
import { parseSuggestionFilter } from "./suggestion-filter";

describe("parseSuggestionFilter", () => {
  it("defaults to mine", () => {
    expect(parseSuggestionFilter(undefined)).toBe("mine");
    expect(parseSuggestionFilter("bogus")).toBe("mine");
  });
  it("accepts the known values", () => {
    expect(parseSuggestionFilter("my-candidates")).toBe("my-candidates");
    expect(parseSuggestionFilter("all")).toBe("all");
  });
});
