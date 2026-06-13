import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Match Maker",
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
      </body>
    </html>
  );
}
