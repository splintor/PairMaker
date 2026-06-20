import { describe, expect, it } from "vitest";
import { normalizePhone, telHref, whatsappNumber, whatsappHref } from "./phone";

describe("normalizePhone", () => {
  it("converts an Israeli international number to local form", () => {
    expect(normalizePhone("+972 52-537-4917")).toBe("0525374917");
    expect(normalizePhone("00972 52-537-4917")).toBe("0525374917");
    expect(normalizePhone("972525374917")).toBe("0525374917");
  });
  it("strips separators from a local number", () => {
    expect(normalizePhone("050-657-5335")).toBe("0506575335");
    expect(normalizePhone("050 657 5335")).toBe("0506575335");
  });
  it("leaves an already-normalized number unchanged", () => {
    expect(normalizePhone("0525374917")).toBe("0525374917");
  });
  it("leaves other-country numbers untouched", () => {
    expect(normalizePhone("+1 415-555-2671")).toBe("+1 415-555-2671");
    expect(normalizePhone("+44 20 7946 0958")).toBe("+44 20 7946 0958");
  });
  it("leaves blank/unrecognized input alone", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone("  ")).toBe("");
  });
});

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
  it("appends a url-encoded prefilled message", () => {
    expect(whatsappHref("050-1234567", "שלום עולם")).toBe(
      `https://wa.me/972501234567?text=${encodeURIComponent("שלום עולם")}`,
    );
  });
});
