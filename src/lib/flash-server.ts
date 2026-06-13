import { cookies } from "next/headers";
import { FLASH_COOKIE, type Flash } from "./flash";

/**
 * Set from a server action just before redirect()/revalidation. Short-lived,
 * readable by JS. Includes a timestamp so the raw cookie value changes on every
 * call — that lets the client effect re-fire even for identical messages.
 */
export async function setFlash(f: Flash): Promise<void> {
  (await cookies()).set(
    FLASH_COOKIE,
    JSON.stringify({ type: f.type, message: f.message, t: Date.now() }),
    { maxAge: 15, path: "/", httpOnly: false, sameSite: "lax" },
  );
}
