import Link from "next/link";
import { readPendingLoginEmail } from "@/lib/pending-login-email";

export default async function VerifyRequestPage() {
  const email = await readPendingLoginEmail();

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl2 border border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100 p-6 text-center shadow-sm">
        <div className="text-4xl">📧</div>
        <h1 className="mt-3 text-2xl font-extrabold text-brand-700">בדקו את האימייל שלכם</h1>
        <p className="mt-3 text-sm text-brand-600">
          {email ? "שלחנו קישור כניסה לכתובת:" : "שלחנו קישור כניסה לכתובת האימייל שלכם."}
        </p>
        {email && (
          <p className="mt-1 text-sm font-semibold text-slate-800" dir="ltr">
            {email}
          </p>
        )}
        <p className="mt-3 text-base text-brand-600">פתחו את ההודעה ולחצו על הקישור כדי להיכנס.</p>
        <p className="mt-1 text-sm text-slate-500">לא הגיע? בדקו גם בתיקיית הספאם.</p>
        <Link href="/signin" className="mt-5 inline-block text-sm text-brand-600 hover:underline">
          ← חזרה להתחברות
        </Link>
      </div>
    </main>
  );
}
