import { describe, it, expect } from "vitest";
import { serializeFlash, parseFlash, type Flash } from "./flash";

describe("flash serialize/parse", () => {
  it("round-trips a success flash", () => {
    const f: Flash = { type: "success", message: "נשמר" };
    expect(parseFlash(serializeFlash(f))).toEqual(f);
  });

  it("round-trips an error flash", () => {
    const f: Flash = { type: "error", message: "שגיאה" };
    expect(parseFlash(serializeFlash(f))).toEqual(f);
  });

  it("returns null for undefined / empty", () => {
    expect(parseFlash(undefined)).toBeNull();
    expect(parseFlash("")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseFlash("not-json")).toBeNull();
  });

  it("returns null when type is not success|error", () => {
    expect(parseFlash(JSON.stringify({ type: "info", message: "x" }))).toBeNull();
  });

  it("returns null when message is missing", () => {
    expect(parseFlash(JSON.stringify({ type: "success" }))).toBeNull();
  });
});
