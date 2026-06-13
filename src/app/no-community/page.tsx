import Link from "next/link";

export default function NoCommunity() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-brand-700">אין לך קהילה עדיין</h1>
          <p className="mt-2 text-sm text-slate-500">בקשו ממנהל/ת הקהילה להוסיף אתכם, או צרו קהילה חדשה.</p>
        </div>
        <Link
          href="/communities/new"
          className="inline-block rounded-lg bg-brand-500 px-4 py-2.5 font-medium text-white hover:bg-brand-600"
        >
          יצירת קהילה חדשה
        </Link>
      </div>
    </main>
  );
}
