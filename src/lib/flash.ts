export type Flash = { type: "success" | "error"; message: string };

export const FLASH_COOKIE = "flash";

export function serializeFlash(f: Flash): string {
  return JSON.stringify(f);
}

export function parseFlash(raw: string | undefined): Flash | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as unknown;
    if (
      typeof obj === "object" &&
      obj !== null &&
      "type" in obj &&
      "message" in obj &&
      (obj.type === "success" || obj.type === "error") &&
      typeof obj.message === "string"
    ) {
      return { type: obj.type, message: obj.message };
    }
  } catch {
    /* fall through */
  }
  return null;
}
