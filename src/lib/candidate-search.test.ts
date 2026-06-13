import { describe, expect, it } from "vitest";
import { buildCandidateWhere, describeActiveFilters, paramsToQuery } from "./candidate-search";

describe("describeActiveFilters", () => {
  it("returns no chips for empty params", () => {
    expect(describeActiveFilters({})).toEqual([]);
  });
  it("describes quick search", () => {
    expect(describeActiveFilters({ q: "כהן" })).toEqual([{ removeKeys: ["q"], label: "חיפוש: כהן" }]);
  });
  it("uses the option label for selects", () => {
    const chips = describeActiveFilters({ sector: "haredi" });
    expect(chips).toEqual([{ removeKeys: ["sector"], label: "מגזר / זרם: חרדי" }]);
  });
  it("describes a number range and removes both bounds", () => {
    const chips = describeActiveFilters({ ageManualMin: "28", ageManualMax: "34" });
    expect(chips[0].removeKeys).toEqual(["ageManualMin", "ageManualMax"]);
    expect(chips[0].label).toContain("28–34");
  });
  it("describes include-inactive", () => {
    expect(describeActiveFilters({ inactive: "1" })).toEqual([
      { removeKeys: ["inactive"], label: "כולל לא-פעילים" },
    ]);
  });
});

describe("paramsToQuery", () => {
  it("omits given keys and empty values", () => {
    const qs = paramsToQuery({ q: "x", gender: "female", sector: "" }, ["gender"]);
    expect(qs).toBe("q=x");
  });
});

const CID = "comm1";

describe("buildCandidateWhere", () => {
  it("scopes to community and defaults to active only", () => {
    const w = buildCandidateWhere({}, CID);
    expect(w.AND).toContainEqual({ communityId: CID });
    expect(w.AND).toContainEqual({ status: "active" });
  });

  it("includes inactive when inactive=1 (no status clause)", () => {
    const w = buildCandidateWhere({ inactive: "1" }, CID);
    expect(w.AND).not.toContainEqual({ status: "active" });
  });

  it("quick search 'q' matches name/occupation/city (insensitive)", () => {
    const w = buildCandidateWhere({ q: "כהן" }, CID);
    expect(w.AND).toContainEqual({
      OR: [
        { name: { contains: "כהן", mode: "insensitive" } },
        { occupation: { contains: "כהן", mode: "insensitive" } },
        { city: { contains: "כהן", mode: "insensitive" } },
      ],
    });
  });

  it("gender select maps to equals on the column", () => {
    const w = buildCandidateWhere({ gender: "female" }, CID);
    expect(w.AND).toContainEqual({ gender: "female" });
  });

  it("number field maps Min/Max to a gte/lte range", () => {
    const w = buildCandidateWhere({ ageManualMin: "28", ageManualMax: "34" }, CID);
    expect(w.AND).toContainEqual({ ageManual: { gte: 28, lte: 34 } });
  });

  it("only-min range omits lte", () => {
    const w = buildCandidateWhere({ heightCmMin: "170" }, CID);
    expect(w.AND).toContainEqual({ heightCm: { gte: 170 } });
  });

  it("details select maps to a JSON path equals", () => {
    const w = buildCandidateWhere({ sector: "haredi" }, CID);
    expect(w.AND).toContainEqual({ details: { path: ["sector"], equals: "haredi" } });
  });

  it("ignores empty / blank params", () => {
    const w = buildCandidateWhere({ q: "  ", gender: "", ageManualMin: "" }, CID);
    expect(w.AND).toEqual([{ communityId: CID }, { status: "active" }]);
  });

  it("ignores a non-numeric range value", () => {
    const w = buildCandidateWhere({ ageManualMin: "abc" }, CID);
    expect(w.AND).toEqual([{ communityId: CID }, { status: "active" }]);
  });
});
