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
    const chips = describeActiveFilters({ ageMin: "28", ageMax: "34" });
    expect(chips[0].removeKeys).toEqual(["ageMin", "ageMax"]);
    expect(chips[0].label).toContain("28–34");
  });
  it("describes a boolean filter as כן/לא", () => {
    expect(describeActiveFilters({ smoking: "true" })).toEqual([
      { removeKeys: ["smoking"], label: "עישון: כן" },
    ]);
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

  it("quick search 'q' matches name/occupation/city/requirements (insensitive)", () => {
    const w = buildCandidateWhere({ q: "כהן" }, CID);
    expect(w.AND).toContainEqual({
      OR: [
        { name: { contains: "כהן", mode: "insensitive" } },
        { occupation: { contains: "כהן", mode: "insensitive" } },
        { city: { contains: "כהן", mode: "insensitive" } },
        { requirements: { contains: "כהן", mode: "insensitive" } },
      ],
    });
  });

  it("advanced requirements filter maps to a column contains", () => {
    const w = buildCandidateWhere({ requirements: "רצינית" }, CID);
    expect(w.AND).toContainEqual({ requirements: { contains: "רצינית", mode: "insensitive" } });
  });

  it("gender select maps to equals on the column", () => {
    const w = buildCandidateWhere({ gender: "female" }, CID);
    expect(w.AND).toContainEqual({ gender: "female" });
  });

  it("age range maps to a birthdate range (older age → earlier birthdate)", () => {
    const w = buildCandidateWhere({ ageMin: "25", ageMax: "35" }, CID);
    const y = new Date().getUTCFullYear();
    const bd = (w.AND as Array<Record<string, unknown>>).find((c) => "birthdate" in c)
      ?.birthdate as { gte: Date; lte: Date };
    expect(bd.lte.getUTCFullYear()).toBe(y - 25);
    expect(bd.gte.getUTCFullYear()).toBe(y - 35);
  });

  it("number field maps Min/Max to a gte/lte range", () => {
    const w = buildCandidateWhere({ heightCmMin: "170", heightCmMax: "185" }, CID);
    expect(w.AND).toContainEqual({ heightCm: { gte: 170, lte: 185 } });
  });

  it("only-min range omits lte", () => {
    const w = buildCandidateWhere({ heightCmMin: "170" }, CID);
    expect(w.AND).toContainEqual({ heightCm: { gte: 170 } });
  });

  it("details select maps to a JSON path equals", () => {
    const w = buildCandidateWhere({ sector: "haredi" }, CID);
    expect(w.AND).toContainEqual({ details: { path: ["sector"], equals: "haredi" } });
  });

  it("boolean filter maps to a JSON path equals", () => {
    const w = buildCandidateWhere({ smoking: "true" }, CID);
    expect(w.AND).toContainEqual({ details: { path: ["smoking"], equals: true } });
    const wf = buildCandidateWhere({ smoking: "false" }, CID);
    expect(wf.AND).toContainEqual({ details: { path: ["smoking"], equals: false } });
  });

  it("ignores empty / blank params", () => {
    const w = buildCandidateWhere({ q: "  ", gender: "", ageMin: "" }, CID);
    expect(w.AND).toEqual([{ communityId: CID }, { status: "active" }]);
  });

  it("ignores a non-numeric range value", () => {
    const w = buildCandidateWhere({ ageMin: "abc" }, CID);
    expect(w.AND).toEqual([{ communityId: CID }, { status: "active" }]);
  });
});
