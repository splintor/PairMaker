import { describe, expect, it } from "vitest";
import { buildCandidateInput, getField } from "./fields";

describe("buildCandidateInput", () => {
  it("routes column vs details and coerces numbers", () => {
    const r = buildCandidateInput({
      firstName: "דנה",
      lastName: "לוי",
      gender: "female",
      age: "27", // virtual — handled by the action, not persisted here
      occupation: "מורה",
      heightCm: "165",
      city: "ירושלים",
      sector: "dati_leumi",
      education: "bachelor",
      requirements: "רציני ובעל מקצוע",
    });
    expect(r.errors).toEqual({});
    expect(r.columns.firstName).toBe("דנה");
    expect(r.columns.lastName).toBe("לוי");
    expect(r.columns.gender).toBe("female");
    expect(r.columns.heightCm).toBe(165);
    expect("age" in r.columns).toBe(false);
    expect(r.details).toEqual({ sector: "dati_leumi", education: "bachelor", smoking: false });
  });

  it("flags missing required fields", () => {
    const r = buildCandidateInput({ firstName: "", lastName: "", gender: "male" });
    expect(r.errors.firstName).toBeDefined();
    expect(r.errors.lastName).toBeDefined();
  });

  it("rejects a non-numeric number field", () => {
    const r = buildCandidateInput({ firstName: "א", lastName: "ב", gender: "male", heightCm: "abc" });
    expect(r.errors.heightCm).toBeDefined();
  });

  it("omits empty optional fields (no null columns, no empty details keys)", () => {
    const r = buildCandidateInput({ firstName: "א", lastName: "ב", gender: "male", heightCm: "", sector: "" });
    expect(r.columns.heightCm).toBeUndefined();
    expect("sector" in r.details).toBe(false);
  });

  it("rejects an out-of-list select value", () => {
    const r = buildCandidateInput({ firstName: "א", lastName: "ב", gender: "female", sector: "not_a_real_option" });
    expect(r.errors.sector).toBeDefined();
  });
});

describe("buildCandidateInput booleans", () => {
  it("stores checked boolean as true in details", () => {
    const { details } = buildCandidateInput({ firstName: "x", lastName: "y", gender: "male", smoking: "true" });
    expect(details.smoking).toBe(true);
  });
  it("stores unchecked boolean as false (never skipped)", () => {
    const { details } = buildCandidateInput({ firstName: "x", lastName: "y", gender: "male" });
    expect(details.smoking).toBe(false);
  });
});

describe("virtual storage", () => {
  it("never writes virtual fields to columns or details", () => {
    const { columns, details } = buildCandidateInput({ firstName: "x", lastName: "y", gender: "male", age: "30" });
    expect("age" in columns).toBe(false);
    expect("age" in details).toBe(false);
  });
});

describe("sector options", () => {
  it("includes the new streams", () => {
    const opts = getField("sector")!.options!.map((o) => o.value);
    expect(opts).toEqual(expect.arrayContaining(["dati_leumi_torani", "dati_patuach", "datlash"]));
  });
});
