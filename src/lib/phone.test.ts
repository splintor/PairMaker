import { describe, expect, it } from "vitest";
import { telHref, whatsappNumber, whatsappHref } from "./phone";

describe("telHref", () => {
  it("strips formatting, keeps a leading +", () => {
    expect(telHref("050-123-4567")).toBe("tel:0501234567");
    expect(telHref("+972 50 123 4567")).toBe("tel:+972501234567");
  });
});

describe("whatsappNumber", () => {
  it("converts a local leading-0 number to 972", () => {
    expect(whatsappNumber("050-1234567")).toBe("972501234567");
  });
  it("keeps an already-international number", () => {
    expect(whatsappNumber("+972 50 1234567")).toBe("972501234567");
    expect(whatsappNumber("972501234567")).toBe("972501234567");
  });
  it("drops a 00 international prefix", () => {
    expect(whatsappNumber("00972501234567")).toBe("972501234567");
  });
  it("prefixes a bare 9-digit mobile with 972", () => {
    expect(whatsappNumber("501234567")).toBe("972501234567");
  });
});

describe("whatsappHref", () => {
  it("builds a wa.me link", () => {
    expect(whatsappHref("050-1234567")).toBe("https://wa.me/972501234567");
  });
});
