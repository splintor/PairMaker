import type { Metadata } from "next";
import { Toaster } from "sonner";
import { cookies } from "next/headers";
import { FlashToasts } from "@/components/FlashToasts";
import { FLASH_COOKIE } from "@/lib/flash";
import "./globals.css";

export const metadata: Metadata = {
  title: "PairMaker",
  description: "מערכת ניהול מועמדים לשידוך",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const flashRaw = (await cookies()).get(FLASH_COOKIE)?.value;

  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#f8f9ff] text-slate-800 antialiased"
        suppressHydrationWarning
      >
        {children}
        <Toaster dir="rtl" position="top-center" richColors />
        <FlashToasts flashRaw={flashRaw} />
      </body>
    </html>
  );
}
