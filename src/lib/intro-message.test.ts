import { describe, expect, it } from "vitest";
import { buildIntroMessage, buildMemberPitchMessage, type IntroParty } from "./intro-message";

const alice: IntroParty = {
  name: "אליס",
  gender: "female",
  age: 27,
  occupation: "מורה",
  city: "תל אביב",
  phone: "052-1234567",
};

const danny = { name: "דני לוי", gender: "male" as const }; // first name → "דני"

describe("buildIntroMessage", () => {
  it("greets the recipient by first name; gender-matched to a male recipient", () => {
    expect(buildIntroMessage(danny, alice)).toBe(
      "היי דני,\nאתה מוזמן ליצור קשר עם אליס, בת 27, מורה מתל אביב. מספר הטלפון שלה הוא 052-1234567.",
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
    expect(buildIntroMessage({ name: "שרה כהן", gender: "female" }, bob)).toBe(
      "היי שרה,\nאת מוזמנת ליצור קשר עם בוב, בן 30, מהנדס מירושלים. מספר הטלפון שלו הוא 053-7654321.",
    );
  });

  it("drops a missing city", () => {
    expect(buildIntroMessage(danny, { ...alice, city: null })).toBe(
      "היי דני,\nאתה מוזמן ליצור קשר עם אליס, בת 27, מורה. מספר הטלפון שלה הוא 052-1234567.",
    );
  });

  it("drops a missing occupation (city keeps its מ prefix)", () => {
    expect(buildIntroMessage(danny, { ...alice, occupation: null })).toBe(
      "היי דני,\nאתה מוזמן ליצור קשר עם אליס, בת 27, מתל אביב. מספר הטלפון שלה הוא 052-1234567.",
    );
  });

  it("drops a missing age", () => {
    expect(buildIntroMessage(danny, { ...alice, age: null })).toBe(
      "היי דני,\nאתה מוזמן ליצור קשר עם אליס, מורה מתל אביב. מספר הטלפון שלה הוא 052-1234567.",
    );
  });

  it("no descriptor at all → just the greeting + invitation + phone", () => {
    expect(buildIntroMessage(danny, { ...alice, age: null, occupation: null, city: null })).toBe(
      "היי דני,\nאתה מוזמן ליצור קשר עם אליס. מספר הטלפון שלה הוא 052-1234567.",
    );
  });
});

describe("buildMemberPitchMessage", () => {
  it("greets creator by first name, bolds both names, links my candidate", () => {
    expect(
      buildMemberPitchMessage({
        creatorName: "יוסי כהן",
        theirCandidate: "אליס",
        myCandidate: "בוב",
        myCandidateUrl: "https://pairmaker.app/app/candidates/c1",
      }),
    ).toBe("היי יוסי,\nחשבתי לשדך את *אליס* עם *בוב* - https://pairmaker.app/app/candidates/c1\n\nמה דעתך?");
  });
});
