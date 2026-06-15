import { describe, expect, it } from "vitest";
import { buildIntroMessage, type IntroParty } from "./intro-message";

const alice: IntroParty = {
  name: "אליס",
  gender: "female",
  age: 27,
  occupation: "מורה",
  city: "תל אביב",
  phone: "052-1234567",
};

describe("buildIntroMessage", () => {
  it("full message, gender-matched to a male recipient", () => {
    expect(buildIntroMessage("male", alice)).toBe(
      "אתה מוזמן ליצור קשר עם אליס, בת 27, מורה מתל אביב. מספר הטלפון שלה הוא 052-1234567.",
    );
  });

  it("female recipient, male intro (possessive + invite flip)", () => {
    const bob: IntroParty = {
      name: "בוב",
      gender: "male",
      age: 30,
      occupation: "מהנדס",
      city: "ירושלים",
      phone: "053-7654321",
    };
    expect(buildIntroMessage("female", bob)).toBe(
      "את מוזמנת ליצור קשר עם בוב, בן 30, מהנדס מירושלים. מספר הטלפון שלו הוא 053-7654321.",
    );
  });

  it("drops a missing city", () => {
    expect(buildIntroMessage("male", { ...alice, city: null })).toBe(
      "אתה מוזמן ליצור קשר עם אליס, בת 27, מורה. מספר הטלפון שלה הוא 052-1234567.",
    );
  });

  it("drops a missing occupation (city keeps its מ prefix)", () => {
    expect(buildIntroMessage("male", { ...alice, occupation: null })).toBe(
      "אתה מוזמן ליצור קשר עם אליס, בת 27, מתל אביב. מספר הטלפון שלה הוא 052-1234567.",
    );
  });

  it("drops a missing age", () => {
    expect(buildIntroMessage("male", { ...alice, age: null })).toBe(
      "אתה מוזמן ליצור קשר עם אליס, מורה מתל אביב. מספר הטלפון שלה הוא 052-1234567.",
    );
  });

  it("no descriptor at all → just the invitation + phone", () => {
    expect(buildIntroMessage("male", { ...alice, age: null, occupation: null, city: null })).toBe(
      "אתה מוזמן ליצור קשר עם אליס. מספר הטלפון שלה הוא 052-1234567.",
    );
  });
});
