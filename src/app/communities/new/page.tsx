import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createCommunity } from "./actions";

export default async function NewCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const { error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl2 border border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100 p-6 shadow-sm">
        <h1 className="text-xl font-extrabold text-brand-700 text-center">קהילה חדשה</h1>
        <p className="mt-1 mb-4 text-center text-sm text-brand-600">
          ליצירת קהילה נדרש קוד הזמנה מהמפעיל.
        </p>
        {error === "code" && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">קוד הזמנה שגוי.</p>
        )}
        {error === "name" && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">יש להזין שם קהילה.</p>
        )}
        <form action={createCommunity} className="space-y-3">
          <input name="name" type="text" dir="rtl" required placeholder="שם הקהילה" className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-right" />
          <input name="code" type="text" dir="rtl" required placeholder="קוד הזמנה" className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-right" />
          <button className="w-full rounded-lg bg-brand-500 py-2.5 font-medium text-white hover:bg-brand-600">יצירה</button>
        </form>
      </div>
    </main>
  );
}
