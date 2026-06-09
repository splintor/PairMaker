import { describe, expect, it } from "vitest";
import { buildCandidateInput } from "./fields";

describe("buildCandidateInput", () => {
  it("routes column vs details and coerces numbers", () => {
    const r = buildCandidateInput({
      name: "דנה לוי",
      gender: "female",
      ageManual: "27",
      occupation: "מורה",
      heightCm: "165",
      city: "ירושלים",
      sector: "dati_leumi",
      education: "bachelor",
      requirements: "רציני ובעל מקצוע",
    });
    expect(r.errors).toEqual({});
    expect(r.columns.name).toBe("דנה לוי");
    expect(r.columns.gender).toBe("female");
    expect(r.columns.ageManual).toBe(27);
    expect(r.columns.heightCm).toBe(165);
    expect(r.details).toEqual({ sector: "dati_leumi", education: "bachelor" });
  });

  it("flags missing required fields", () => {
    const r = buildCandidateInput({ name: "", gender: "male" });
    expect(r.errors.name).toBeDefined();
  });

  it("rejects a non-numeric number field", () => {
    const r = buildCandidateInput({ name: "א", gender: "male", ageManual: "abc" });
    expect(r.errors.ageManual).toBeDefined();
  });

  it("omits empty optional fields (no null columns, no empty details keys)", () => {
    const r = buildCandidateInput({ name: "א", gender: "male", ageManual: "", sector: "" });
    expect(r.columns.ageManual).toBeUndefined();
    expect("sector" in r.details).toBe(false);
  });

  it("rejects an out-of-list select value", () => {
    const r = buildCandidateInput({ name: "א", gender: "female", sector: "not_a_real_option" });
    expect(r.errors.sector).toBeDefined();
  });
});
