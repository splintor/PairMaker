import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Suspense } from "react";
import { FlashToasts } from "@/components/FlashToasts";
import "./globals.css";

export const metadata: Metadata = {
  title: "PairMaker",
  description: "מערכת ניהול מועמדים לשידוך",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#f8f9ff] text-slate-800 antialiased"
        suppressHydrationWarning
      >
        {children}
        <Toaster dir="rtl" position="top-center" richColors />
        <Suspense fallback={null}>
          <FlashToasts />
        </Suspense>
      </body>
    </html>
  );
}
