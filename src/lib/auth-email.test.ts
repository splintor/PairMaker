import { describe, expect, it } from "vitest";
import { magicLinkEmail } from "./auth-email";

describe("magicLinkEmail", () => {
  const { subject, text, html } = magicLinkEmail("https://pairmaker.app/login?token=abc");
  it("has a Hebrew subject", () => expect(subject).toBe("כניסה ל-Pair Maker"));
  it("embeds the magic url in both text and html", () => {
    expect(text).toContain("https://pairmaker.app/login?token=abc");
    expect(html).toContain("https://pairmaker.app/login?token=abc");
  });
  it("includes the welcome copy and an RTL document", () => {
    expect(text).toContain("ברוך הבא ל-Pair Maker");
    expect(html).toContain('dir="rtl"');
  });
});
