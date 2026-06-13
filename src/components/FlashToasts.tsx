"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { FLASH_COOKIE, parseFlash } from "@/lib/flash";

/**
 * Fires a sonner toast for the flash cookie read server-side in the layout.
 * `flashRaw` carries a timestamp so two identical messages still differ and re-fire.
 * Clears the cookie client-side after firing so it shows exactly once.
 */
export function FlashToasts({ flashRaw }: { flashRaw?: string }) {
  useEffect(() => {
    const flash = parseFlash(flashRaw);
    if (!flash) return;
    document.cookie = `${FLASH_COOKIE}=; max-age=0; path=/`;
    if (flash.type === "success") toast.success(flash.message);
    else toast.error(flash.message);
  }, [flashRaw]);

  return null;
}
