import { cookies } from "next/headers";
import { FLASH_COOKIE, serializeFlash, type Flash } from "./flash";

/** Set from a server action just before redirect(). Short-lived, readable by JS. */
export async function setFlash(f: Flash): Promise<void> {
  (await cookies()).set(FLASH_COOKIE, serializeFlash(f), {
    maxAge: 15,
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });
}
