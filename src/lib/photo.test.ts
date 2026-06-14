import { describe, it, expect } from "vitest";
import {
  validatePhotoUpload,
  MAX_PHOTO_BYTES,
  ACCEPTED_PHOTO_TYPES,
  candidatePhotoSrc,
} from "./photo";

describe("validatePhotoUpload", () => {
  it("accepts a small jpeg", () => {
    expect(validatePhotoUpload({ type: "image/jpeg", size: 200_000 })).toEqual({ ok: true });
  });

  it("accepts png and webp", () => {
    expect(validatePhotoUpload({ type: "image/png", size: 1000 }).ok).toBe(true);
    expect(validatePhotoUpload({ type: "image/webp", size: 1000 }).ok).toBe(true);
  });

  it("rejects an unsupported type", () => {
    const r = validatePhotoUpload({ type: "image/gif", size: 1000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("סוג");
  });

  it("rejects an oversized file", () => {
    const r = validatePhotoUpload({ type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("גדול");
  });

  it("exposes accepted types", () => {
    expect(ACCEPTED_PHOTO_TYPES).toContain("image/jpeg");
  });
});

describe("candidatePhotoSrc", () => {
  it("includes a version token derived from the blob handle", () => {
    expect(candidatePhotoSrc("cand1", "candidates/abc.jpg")).toBe(
      "/api/candidates/cand1/photo?v=candidates%2Fabc.jpg",
    );
  });

  it("changes when the blob handle changes (busts the cache)", () => {
    const a = candidatePhotoSrc("cand1", "candidates/old.jpg");
    const b = candidatePhotoSrc("cand1", "candidates/new.jpg");
    expect(a).not.toBe(b);
  });
});
