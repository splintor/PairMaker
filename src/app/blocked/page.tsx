import { EmptyState } from "@/components/EmptyState";
import { signOut } from "@/lib/auth";

export default function Blocked() {
  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <EmptyState
          icon="🚫"
          title="הגישה שלך נחסמה"
          hint="חשבונך נחסם על ידי מנהל/ת. לפרטים נוספים יש לפנות למנהל/ת הקהילה."
        />
        <form action={doSignOut} className="mt-4 text-center">
          <button className="text-sm text-slate-400 hover:text-slate-600">יציאה</button>
        </form>
      </div>
    </main>
  );
}
