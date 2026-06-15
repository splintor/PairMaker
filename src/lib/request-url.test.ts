import { describe, expect, it } from "vitest";
import { originFromHeaders } from "./request-url";

describe("originFromHeaders", () => {
  it("uses x-forwarded-proto and x-forwarded-host", () => {
    const h = new Headers({ "x-forwarded-proto": "https", "x-forwarded-host": "pairmaker.app" });
    expect(originFromHeaders(h)).toBe("https://pairmaker.app");
  });
  it("falls back to host and https", () => {
    const h = new Headers({ host: "localhost:3000" });
    expect(originFromHeaders(h)).toBe("https://localhost:3000");
  });
});
