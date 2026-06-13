"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FLASH_COOKIE, parseFlash } from "@/lib/flash";

function readCookie(name: string): string | undefined {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** Reads the `flash` cookie after each navigation, fires a toast, then clears it. */
export function FlashToasts() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const flash = parseFlash(readCookie(FLASH_COOKIE));
    if (!flash) return;
    document.cookie = `${FLASH_COOKIE}=; max-age=0; path=/`;
    if (flash.type === "success") toast.success(flash.message);
    else toast.error(flash.message);
  }, [pathname, searchParams]);

  return null;
}
